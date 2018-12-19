<?php
// Copyright Monwoo 2017-2018, by Miguel Monwoo, service@monwoo.com

namespace Monwoo\Provider;
use Silex\Application;
use Silex\Api\EventListenerProviderInterface;
use Silex\Api\ControllerProviderInterface;
use Silex\Api\BootableProviderInterface;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Pimple\Container;
use Pimple\ServiceProviderInterface;
use LogicException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PropertyAccess\PropertyPath;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type as FormType;
use App\MonwooConnector\Form\Type as MonwooConnectorType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpKernel\HttpKernelInterface;
use Symfony\Component\Process\ProcessBuilder;
use Symfony\Component\Yaml\Yaml;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\DomCrawler\Crawler;
use Monwoo\Middleware\AddingCors;

use Monwoo\Middleware\MonwooDataEventsMiddleware;
use JasonGrimes\Paginator;

class ImapDataProvider extends DataProvider
{
    const cacheLifetime = 60*30; // 30 minutes

    protected $imap = null;
    protected $storage = null;
    protected function init() {
        $self = $this;
        $self->dataset = [];
        $self->dataset_name = 'ImapData';
        $self->dataset_id = 'data_imap';
    }
    protected function storeInCache($key, $data) {
        $app = $this->app;
        $app['cache']->store($key, base64_encode(json_encode($data)), self::cacheLifetime);
        return $this;
    }
    protected function fetchFromCache($key) {
        $app = $this->app;
        // var_dump(json_decode(base64_decode($app['cache']->fetch($key)))); exit;
        return json_decode(base64_decode($app['cache']->fetch($key)), true);
    }

    protected function getUserDataStoreKey() {
        $self = $this;
        $app = $self->app;
        $sessionId = $app['session']->getId();
        return $sessionId . "." . $self->dataset_id;
    }

    /**
    * {@inheritdoc}
    */
    public function register(Container $app) {
        parent::register($app);
        $self = $this;
        $app->before(function($request, $app) use ($self) {
            $locale = $app['locale'];
            $data = [];
            $self->dataset = &$data;
            /* DEBUG
            $app['logger']->debug('Imap Data Will transform');
            // */
            // $app["{$self->manager_route_name}.data"] = $data; // Always empty ?
            $self->updateGeneratedData();
        });
    }
    protected function getNewId() { // TODO : refactor, not use ? or optim feature
        $prefix = 'imap_id_';
        if ($self->countOfIds) {
            $self->countOfIds++;
        } else {
            $self->countOfIds = 1;
        }
        return $prefix . $self->countOfIds;
    }
    protected function ifameBuilder($srcPath) {
        $self = $this;
        $app = $self->app;
        // $assetManager = $app['assets.packages'];
        // $loadingPictPath = $assetManager
        // ->getUrl('assets/img/LoadingIndicator.png');
        $loadingPictPath = "assets/simple-pre-loader/images/loader-128x/Preloader_3.gif";
        $iframePath = $app->url($self->actionRouteName(), [
            'action' => 'msg_body',
            'param' => $srcPath,
        ]);
        $iframeStyle = 'min-height:250px;max-height:800px;width:100%';
        return "<iframe
        src='$loadingPictPath'
        data-didLoad='0'
        data-src='$iframePath'
        frameborder='0'
        style='$iframeStyle'
        ></iframe>";
    }
    /**
    * Builds an OAuth2 authentication string for the given email address and access
    * token.
    */
    protected function constructAuthString($email, $accessToken) {
        // return base64_encode("user=$email\001auth=Bearer $accessToken\001\001");
        return base64_encode("user=$email\1auth=Bearer $accessToken\1\1");
    }
    /**
    * Given an open IMAP connection, attempts to authenticate with OAuth2.
    * DEPRECIATED => Better use Google API instead of IMAP for Gmails access
    *
    * $imap is an open IMAP connection.
    * $email is a Gmail address.
    * $accessToken is a valid OAuth 2.0 access token for the given email address.
    *
    * Returns true on successful authentication, false otherwise.
    */
    protected function _imapGoogleAuthenticate($imap, $email, $accessToken) {
        $self = $this;
        $app = $self->app;
        // var_dump($accessToken); exit;
        $authenticateParams = array('XOAUTH2',
        $self->constructAuthString($email, $accessToken));
        $tag = 'TAG1';
        $imap->sendRequest('AUTHENTICATE', $authenticateParams, $tag);
        $debugBacklog = "";
        while (true) {
            $response = "";
            $is_plus = $imap->readLine($response, '+', true);
            $debugBacklog .= $response . "|\n";
            if ($is_plus) {
                // * DEBUG
                $app['logger']->debug('Imap Auth got an extra server challenge', [
                    'response' => $response,
                ]);
                // */
                // Send empty client response.
                $imap->sendRequest('');
            } else {
                if (preg_match('/^NO /i', $response) ||
                preg_match('/^BAD /i', $response)) {
                    $app['logger']->error('Imap Auth got got failure response', [
                        'response' => $response,
                        // https://developers.google.com/drive/v3/web/handle-errors#401_invalid_credentials
                        'googleImapErr' => base64_decode(explode('|', $debugBacklog)[0]),
                        'debugBacklog' => $debugBacklog,
                        'email' => $email,
                        'accessToken' => $accessToken,
                    ]);
                    return false;
                } else if (preg_match("/^OK /i", $response)) {
                    return true;
                } else {
                    // Some untagged response, such as CAPABILITY
                }
            }
        }
    }
    protected function passwordDecode($password) {
        if (!$password) {
            return null;
        }
        if (0 === strpos($password, '*#__hash')) {
            // TODO : optimise secu : send random hash with local server securized acces to user password...
            // But ok for now if ssl layer above request communications, cache folder have a 30min time limit and is accessible by app only...
            // TODO : clean cached password on user session out => event listener ?
            $password = base64_decode(substr($password, 15));
        }
        return $password;
    }
    protected function passwordEncode($password) {
        // $app['logger']->debug("InPass : " . $password);
        if (!$password) {
            return null;
        }
        if (0 === strpos($password, '*#__key')) {
            // Decode encoding algo of js frontend side if front end did have js to encode password
            $password = base64_decode(substr($password, 7));
            // $app['logger']->debug("Pass : " . $password);

            // var_dump($password); exit;
        }
        if (0 === strpos($password, '*#__hash')) {
            return $password; // no double encode
        }
        return '*#__hash' . substr(base64_encode(random_bytes(10)), 0, 7)
        . base64_encode($password);
    }
    protected function extratSimpleContactAdress($emailFrom) {
        return preg_replace(
            '/.*[\b<]([A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+[A-Z]{2,6}).*/i',
            '$1', $emailFrom
        );
        // Reg ex for to field : multiple email contacts :
        // https://stackoverflow.com/questions/3885865/regex-to-parse-email-form-to-field
        // preg_match_all('/\b[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+[A-Z]{2,6}\b/i', $subject, $result, PREG_PATTERN_ORDER);
    }
    protected function startImapProtocole($connection, $accessToken) {
        $self = $this;
        // if ($self->imap) { // TODO : can't symply return for optim, since may have multiple imap connection in multiple mail box...
        //     return $self; // It's already started, TODO : retry if last fail ?
        // }
        $app = $self->app;
        // [
        // 	'host'     => $connection['mailhost'],
        // 	'user'     => $connection['username'],
        // 	'password' => $password, // TODO : from form, no cache value = secu ok ?
        //     'ssl' => true,
        // ];
        // * DEBUG
        $app['logger']->debug("Starting connection {$connection['username']}", [
            '$connection' => $connection,
        ]);
        $imap = null;
        $password = null;
        if (isset($connection['password'])) {
            $password = $self->passwordDecode($connection['password']);
        }
        // */
        if ($connection['authtype'] === 'imapGoogle') {
          /* Legacy code (Need some Open secu from your GMail acount, not advised for productions...) :
            $imapAuthToken = $accessToken['access_token']; // TODO refactor : it's more like authToken is AccessToken and vis versa in variables namings
            $imap = new \Zend\Mail\Protocol\Imap();
            // $imap->connect('imap.gmail.com', '993', 'ssl');
            $imap->connect($connection['mailhost'], '993', 'ssl');
            // TODO : do not seem to work with google imap connection,
            if ($self->imapGoogleAuthenticate($imap, $connection['username'], $imapAuthToken)) {
                // * DEBUG
                $app['logger']->debug("Succed to connect to google IMAP {$connection['username']}", [
                    '$connection' => $connection,
                ]);
                // * /
            } else {
                $app['logger']->error("Fail to connect to Email {$connection['username']}", [
                    'connection' => $connection,
                    'accessToken' => $accessToken, // TODO : use $password to get imapGoogle token access ?
                    'imapAuthToken' => $imapAuthToken,
                ]);
            }
            */
        } else {
            // $app['logger']->debug("Will try Imap : "
            // . $app->json([
            //     'connection' => $connection,
            //     'password' => $password,
            // ])->getContent());

            $imap = new \Zend\Mail\Protocol\Imap();
            $imap->connect($connection['mailhost'], '993', 'SSL');
            if (! $imap->login($connection['username'], $password)) {
                throw new \Exception('cannot login, wrong user or password');
            }
        }
        // TODO : make gmail imap with zend mail work and factorise
        // code below : same functionnal code either it's gmail or regular imap...
        $this->storage = new \Zend\Mail\Storage\Imap($imap);
        $this->imap = $imap;
        // TODO assert witout imap_errors not available evrywhere
        // $imapErr = imap_errors();
        // $app['logger']->assert($this->storage,
        // "Inbox should have been set", $imapErr);
        // Tree view of mailbox :
        // $folders = new \RecursiveIteratorIterator(
        //     $imap->listMailbox(),
        //     \RecursiveIteratorIterator::SELF_FIRST
        // );
        return $this;
    }
    protected function handleAction($action, $param) {
        $self = $this;
        $app = $self->app;
        $request = $app['request_stack']->getCurrentRequest();
        $locale = $app['locale'];
        $success = true;
        $self->context = [];
        $self->actionResponse = null;

        // if ('OPTIONS' === $request->getMethod()) {
        //   $r = new Response('', 200);
        //   AddingCors::addCors($request, $r);
        //   // TODO : why failback needed ? before check in index.php should have catch it right ?
        //   $app['logger']->debug("Allowing options Failback");
        //   $self->actionResponse = $r;
        //   return true;
        // }
  
        $token = $app['security.token_storage']->getToken();
        $user = $token->getUser();
        $localUsers = $app['session']->get('users', []);
        $localUser = $localUsers[$token->getUsername()];
        $self->defaultConfig = [
            'connections' =>[
              'serviceEmail' => [
                  'username' => $localUser['username'],
                  'authtype' => '',
                  'mailhost' => $localUser['params']['mailhost'],
                  'mailport' => $localUser['params']['mailport'],
                  'password' => $localUser['password'], // Do not put your passwords in default config, will be cached online...
              ],
          ],
        ];
        $app['logger']->debug("ImapData $action : "
        . $app->json([
            'conf' => $self->defaultConfig,
            'userName' => $token->getUsername(),
            'user' => $user,
            'localUsers' => $localUsers,
        ])->getContent());

        $self->context['dataProvider'] = $self;
        $order_by = $request->get('order_by') ?: 'time';
        $order_dir = $request->get('order_dir') == 'ASC' ? 'ASC' : 'DESC';
        $limit = (int)($request->get('limit') ?: 20);
        $page = (int)($request->get('page') ?: 1);
        if ($request->get('page')) { // TODO : improve if test on pagination params ?
            // have pagination request, save it for chained processing
            $self->setSession('order_by', $order_by);
            $self->setSession('order_dir', $order_dir);
            $self->setSession('limit', $limit);
            $self->setSession('page', $page);
        } else {
            $order_by = $self->getSession('order_by') ?? $order_by;
            $order_dir = $self->getSession('order_dir') ?? $order_dir;
            $limit = $self->getSession('limit') ?? $limit;
            $page = $self->getSession('page') ?? $page;
        }
        $offset = ($page - 1) * $limit;
        $self->offsetStart = $offset;
        $self->offsetLimit = $limit;
        if ('admin_form' === $action) {
        } else if ('admin_results' === $action) {
            // $self->context['admin_result_form'] = $self->buildAdminForm();
            // $self->context['admin_edit_form'] = $self->buildEditForm();
            // TODO : if $page > maxNbPage => rewind to page 1
            $paginator = new \JasonGrimes\Paginator(
                $self->getSession('numResults'),
                $limit, $page,
                $app->path("TODO", [
                    'action' => 'admin_results',
                    // Escape issue : 'page' => '(:num)',
                    'limit' => $limit,
                    'order_by' => $order_by,
                    'order_dir' => $order_dir,
                ]) . '&page=(:num)'
                // $app['url_generator']->generate($self->manager_route_name)
                // . '?page=(:num)&limit=' . $limit . '&order_by='
                // . $order_by . '&order_dir=' . $order_dir
            );
            $self->context['paginator'] = $paginator;
            $self->actionResponse = $self->actionResponse ?? $app['twig']->render(
                'MonwooConnector/Imap/admin_results.twig', $self->context
            );
        } else if ('submit_refresh' === $action) {
            // $self->context['admin_result_form'] = $self->buildAdminForm();
            $status = [
                'errors' => [],
            ];
            $connections = $self->defaultConfig["connections"];
            $numResults = 0;
            $totalCount = 0;
            $msgsOrderedByDate = [
            /* Data model to be able to filter on expeditor|timestamp|tags
               |keywords in tags|connection source name :
                [
                    // Key is email from field from msg, regex clean to get email only (ignore naming part)
                    'expeditor' => 'msg@from.com',
                    'headers' => Yaml::dump($headers, 4), // all msg headers
                    'expeditorMainAnswerBox' => 'msg@from.com', // Hand editable field to link multiple clients account to one.
                    'expeditorFullName' => 'msg@from.com', // Full expeditor label
                    'haveMoonShopEvent' => true, // Status to true if expeditor is found inside clients email of MoonShop events
                    'localTime' => '2017/05/30 12:00' // Translated local time of the message timestamp
                    'timestamp' => , // will be used for timeline ordering sorting algos
                    'to' => '',
                    'cc' => '',
                    'bcc' => '',
                    'tags' => [], // editable filterable tags from configuration form
                    'msg' => , // Normalized Mail message to display summary in ui + id for fetching
                    // Configure minimal body summary lenght to get all generated data from auto-mailing
                    'connection' => , // used connection, without password,
                    // store password inside temporary session variables
                    // (Password save may Expire 42 min after form update)
                    // use it to fetch message details if required from ui
                ],
                // Will display N last emails based on configurable filters
                // Linear output will be sorted first by timestamp, then by expeditors
                // Expeditor sorting will sort chronlogicaly based
                // on most resent message of expeditor that have MoonShopEvent
                // first and then do same to other expeditors
                // Display template will agregate continus expedior data,
                // Showing highligh for expeditor having MoonShopEvent linked
                // This way => consulting email will directly show first most resent email of
                // linked user in MoonShop backend + allow easy filtering on linear model.
            */
            ];
            // TODO : load from DB : MoonShopEvent regroup on client email ?
            // + append custom client email from spreadsheet ?
            $moonBoxEmailsGrouping = $localUser['params']['moonBoxEmailsGrouping'] ?? [];
            // [
            //     'xxx@yopmail.com' => 'xxx@yopmail.com',
            //     'aaa@yopmail.com' => 'aaa@yopmail.com',
            // ];
            // var_dump($connections); exit();
            foreach ($connections as $connectionName => $connection) {
                try {
                    $self->startImapProtocole($connection, $accessToken);
                    $folders = [];
                		$foldersRoot = $this->storage->getFolders();
                    $foldersIt = new \RecursiveIteratorIterator(
                        $foldersRoot,
                        \RecursiveIteratorIterator::SELF_FIRST
                    );
                    foreach ($foldersIt as $localName => $folder) {
                        $localName = str_pad('', $foldersIt->getDepth()
                        , '-', STR_PAD_LEFT) . $localName;
                        $loadedFolder = [
                            'name' => $localName,
                            'folder' => strval($folder),
                            'isSelectable' => $folder->isSelectable(),
                        ];
                        $folders[] = $loadedFolder;
                    }
                    // Build IMAP search query
                    // http://php.net/manual/fr/function.imap-search.php
                    // https://framework.zend.com/apidoc/2.1/classes/Zend.Mail.Storage.Imap.html
                    $imapQuery = [];
                    if (isset($localUser['periode'])
                    && isset($localUser['periode']['fetchStartStr'])
                    && $localUser['periode']['fetchStartStr']) {
                        $startDate = \DateTime::createFromFormat('Y/m/d',
                        $localUser['periode']['fetchStartStr'])
                        ->format('d-M-Y');
                        $imapQuery[] = "SINCE \"$startDate\"";
                    }
                    if (isset($localUser['periode'])
                    && isset($localUser['periode']['fetchEndStr'])
                    && $localUser['periode']['fetchEndStr']) {
                        $endDate = \DateTime::createFromFormat('Y/m/d',
                        $localUser['periode']['fetchEndStr'])
                        ->format('d-M-Y');
                        $imapQuery[] = "BEFORE \"$endDate\"";
                    }
                    if (isset($localUser['params'])
                    && isset($localUser['params']['keywordsSubject'])) {
                        foreach ($localUser['params']['keywordsSubject'] as $keyword) {
                            $imapQuery[] = "SUBJECT \"$keyword\"";
                            // TODO : need to multiple fetch with other possible keyword position
                            // $imapQuery[] = "TEXT \"$keyword\"";
                            // Will only search in subject for v1
                            // $imapQuery[] = "FROM \"$keyword\"";
                            // $imapQuery[] = "TO \"$keyword\"";
                            // $imapQuery[] = "CC \"$keyword\"";
                            // $imapQuery[] = "BCC \"$keyword\"";
                            // $imapQuery[] = "BODY \"$keyword\"";
                            // $imapQuery[] = "KEYWORD \"$keyword\"";
                        }
                    }
                    if (isset($localUser['params'])
                    && isset($localUser['params']['keywordsBody'])) {
                        foreach ($localUser['params']['keywordsBody'] as $keyword) {
                            $imapQuery[] = "TEXT \"$keyword\"";
                        }
                    }
                    if (isset($localUser['params'])
                    && isset($localUser['params']['avoidwords'])) {
                        // TODO : not realy working... well, do not check body or part words :
                        foreach ($localUser['params']['avoidwords'] as $avoidword) {
                            $imapQuery[] = "UNKEYWORD \"$avoidword\"";
                        }
                    }
                    if (!count($imapQuery)) {
                        $imapQuery[] = "ALL";
                    }
                    // TODO : http://php.net/manual/en/function.imap-listscan.php ?
                    // https://github.com/HvyIndustries/crane-php-stubs/blob/master/imap.php
                    // http://www.csi.sssup.it/docs/php4/en-html-manual/ref.imap.html
                    // http://php.net/manual/en/function.imap-fetchstructure.php

                    // SE_UID option like in http://www.php.net/manual/en/function.imap-search.php ?
                    $msgIds = $this->imap->search($imapQuery);
                    $totalCountOfMsg = count($msgIds);
                    $totalCount += $totalCountOfMsg;
                    $msgIds = array_slice($msgIds, $self->offsetStart, $self->offsetLimit);
                    $numResultsOfMsg = count($msgIds);
                    // $numResults = max($totalCountOfMsg, $numResults);
                    $numResults += $numResultsOfMsg; // max($totalCountOfMsg, $numResults);
                    // for ($it = $totalCountOfMsg - $offset;
                    // $it > 0 && $it > $totalCountOfMsg - $offset - $limit; $it-- ) {
                    //     $i = $msgIds[$it - 1];
                    foreach ($msgIds as $i) {
                        try {
                            // https://docs.zendframework.com/zend-mail/read/
                            // https://framework.zend.com/manual/2.4/en/modules/zend.mail.message.html
                            // Zend\Mail\Storage\Message instance
                            $msgStore = $this->storage->getMessage($i);
                            // https://framework.zend.com/manual/2.1/en/modules/zend.mail.read.html
                            $msg = $msgStore;
                            $headers = [];
                            foreach ($msg->getHeaders() as $header) {
                                // $headers[] = $header->toString();
                                // or grab values: $header->getFieldName(), $header->getFieldValue()
                                $headers[$header->getFieldName()] = $header->getFieldValue();
                            }
                            $subject = $msg->subject;//htmlentities($msg->subject);
                            $msgFlags = $msg->getFlags();
                            // $body = $msg->mail->getBody(); // or get raw message and instanciate imap msg with it...;
                            $msgDateTime = new \DateTime($headers['Date']);
                            $timestamp = $msgDateTime->getTimestamp();
                            $localTime = $msgDateTime->format('Y/m/d H:i');
                            // $msgsSummary[] = [
                            //     'headers' => $headers,
                            //     'subject' => $subject,
                            // ];
                            $expeditorFullName = $headers['From'];
                            $expeditor = $self->extratSimpleContactAdress($expeditorFullName);
                            $expeditorMainAnswerBox =
                            isset($mainAnswerBoxByExpeditor[$expeditor])
                            ? $mainAnswerBoxByExpeditor[$expeditor] : $expeditor;
                            $msgId = $headers['Message-ID']; // TODO What if missing ? need auto-gen id on save or combine keys (name + src + time) ?
                            $msgsOrderedByDate[] = [
                                'expeditorFullName' => $expeditorFullName,
                                'expeditorMainAnswerBox' => $expeditorMainAnswerBox,
                                'subject' => $subject,
                                'msgFlags' => $msgFlags,
                                // Computed on demand with next action :
                                // 'body' => $body, // htmlentities($msg->getBody()),
                                'localTime' => $localTime, //$msgHeaders->getInternalDate(), // will be used for timeline ordering
                                'headers' => Yaml::dump($headers, 4),
                                'expeditor' => $expeditor,
                                'haveMoonShopEvent' => false, // TODO : grouped hash table extract from MoonShopEvents DB + check key exist for this value
                                'timestamp' => $timestamp, //$msgHeaders->getInternalDate(), // will be used for timeline ordering
                                // 'to' => $msg->getTo(),
                                // 'replyTo' => $msg->getReplyTo(), // TODO getReplyTo
                                'to' => isset($headers['To']) ? $headers['To'] : '',
                                // : (isset($headers['Reply-To']) ? $headers['Reply-To'] : ''),
                                // 'cc' => $msg->getCc(), // isset($headers['Cc']) ? $headers['Cc'] : '',
                                // 'bcc' => $msg->getBcc(), // isset($headers['Bcc']) ? $headers['Bcc'] : '',
                                'cc' => isset($headers['Cc']) ? $headers['Cc'] : '',
                                'bcc' => isset($headers['Bcc']) ? $headers['Bcc'] : '',
                                'tags' => '', // [], // : TODO : load from cache, build with key index as : "$expeditor.$msgId"
                                // 'msg' => $msgPayload, // TODO : Normalized Mail message to display summary in ui + id for fetching
                                'msgId' => $msgId,
                                'msgUniqueId' => $this->storage->getUniqueId($i), // Bounded to wich query ? not foud id for now...
                                'imapId' => $i, // NOT usable without linked query ?
                                // Configure minimal body summary lenght to get all generated data from auto-mailing
                                'connectionName' => $connectionName, // used connection, without password,
                                'connectionUser' => $connection['username'],
                            ];
                        } catch (\Throwable $e) {
                            $errMsg = 'Exception '.get_class($e).': '.$e->getMessage();
                            $errPos = $e->getFile().':'.$e->getLine();
                            $errTrace = $e->getTrace();
                            // $app['session']->getFlashBag()->add('error'
                            // , "Faild to load MSG $i for {$connection['username']}");
                            $app['logger']->error("Fail to load Imap {$connection['username']}"
                            , [$errMsg, $errPos, $errTrace]);
                            array_push($status['errors'], $errMsg);
                        }
                    }
                    $status['folders'] = $folders;
                    // * DEBUG
                    $app['logger']->debug("Did open MailBox {$connection['username']}" . json_encode([
                        'mailBoxFolders' => $folders,
                        'totalCountOfMsg' => $totalCountOfMsg,
                        // 'msgsOrderedByDate' => $msgsOrderedByDate,
                        'imapQuery' => $imapQuery,
                    ]));
                    // */
                } catch (\Throwable $e) {
                    $errMsg = 'Exception '.get_class($e).': '.$e->getMessage();
                    $errPos = $e->getFile().':'.$e->getLine();
                    $errTrace = $e->getTrace();
                    $errTitle = "Fail to load Imap {$connection['username']}";
                    // $app['session']->getFlashBag()->add('error'
                    // , "Faild to load Imap {$connection['username']}");
                    $app['logger']->error($errTitle
                    , [$errMsg, $errPos, $errTrace]);
                    array_push($status['errors'], [$errTitle, $errMsg]);
                }
            }
            $msgComparator = function ($a, $b) {
                // $cmp = strtolower($a['expeditorMainAnswerBox'])
                // <=> strtolower($b['expeditorMainAnswerBox']);
                // return $cmp ? $cmp : $b['timestamp'] <=> $a['timestamp'];
                return $b['timestamp'] <=> $a['timestamp'];
            };
            usort($msgsOrderedByDate, $msgComparator);
            // Transform data based on previously ordered messages
            foreach ($msgsOrderedByDate as $it => $msg) {
                $msgsOrderedByDate[$it]
                ['iframeBody'] = $self->ifameBuilder(
                    "{$msg['connectionName']}<|>[$it][body]"
                );
            }

            $defaultGroup = "_";
            $msgsByMoonBoxGroup = [];
            foreach ($msgsOrderedByDate as &$msg) {
                $moonBoxGroup = $defaultGroup;
                if (isset($moonBoxEmailsGrouping[
                    $msg['expeditorMainAnswerBox']
                ])) {
                    $moonBoxGroup = $moonBoxEmailsGrouping[
                        $msg['expeditorMainAnswerBox']
                    ];
                    $msg['haveMoonBoxGroupping'] = true;
                    if (isset($msgsByMoonBoxGroup[$moonBoxGroup])) {
                        $msgsByMoonBoxGroup[$moonBoxGroup][] = $msg;
                    } else {
                        $msgsByMoonBoxGroup[$moonBoxGroup] = [ $msg ];      
                    }
                } else {
                    if (isset($msgsByMoonBoxGroup[$defaultGroup])) {
                        $msgsByMoonBoxGroup[$defaultGroup][] = $msg;
                    } else {
                        $msgsByMoonBoxGroup[$defaultGroup] = [ $msg ];
                    }
                }
                $msg['moonBoxGroup'] = $moonBoxGroup;
            }

            $self->storeInCache($self->getUserDataStoreKey(), $msgsOrderedByDate);
            // TODO : refactor saved data model to be extendable object ?
            // $msgsOrderedByDate->numResults = $numResults;
            $self->actionResponse = $app->json([
                'status' => $status,
                'numResults' => $numResults,
                'msgsOrderedByDate' => $msgsOrderedByDate,
                'msgsByMoonBoxGroup' => $msgsByMoonBoxGroup,
                'totalCount' => $totalCount,
                'offsetStart' => $self->offsetStart,
                'offsetLimit' => $self->offsetLimit,
                'currentPage' => $page,
                'nextPage' => ($self->offsetStart + $numResults < $totalCount) ? $page + 1 : null,
            ]);
        } else if ('msg_body' === $action) { // TODO: why not protected by JWT ? Only by php session id for now...
            $param = explode('<|>', $param);
            $connections = $self->defaultConfig["connections"];
            $connection = $connections[$param[0]];
            $bodyPath = $param[1];
            // TODO : realy slow for each iframe rendering.
            // May be store needed data in session to speed up iframe load ?
            // May be it load each frame with debug info system (can see multiple call for each frames)
            $editData = $self->fetchFromCache($self->getUserDataStoreKey());
            $msgBody = quoted_printable_decode(
                $app->fetchByPath($editData, $bodyPath)
            );
            if (!$msgBody) {
                $bodyText = null;
                $bodyHTML = null;
                $self->startImapProtocole($connection, $accessToken);
                // * DEBUG
                $app['logger']->debug("Loading content at $bodyPath for {$connection['username']}", [
                    'msg' => $app->fetchByPath($editData,
                    str_replace('[body]', '', $bodyPath)),
                    'connection' => $connection,
                    // 'msgIds' => $msgIds,
                ]);
                // */
                $msgUniqueIdPath = str_replace('[body]', '[msgUniqueId]', $bodyPath);
                $msgUniqueId = $app->fetchByPath($editData, $msgUniqueIdPath);
                $imapId = $this->storage->getNumberByUniqueId($msgUniqueId);
                // the imapId stored in msg is linked to search query, need to use the msgUniqueId instead
                // $imapIdPath = str_replace('[body]', '[imapId]', $bodyPath);
                // $imapId = $app->fetchByPath($editData, $imapIdPath);
                $msg = $this->storage->getMessage(intval($imapId));
                $app['logger']->assert($msg,
                "Loading msg $imapId for {$connection['username']} FAIL");
                $msgFlags = $msg->getFlags();
                if ($msg->isMultipart()) {
                    // TODO : body part is part 0 or partId (eq to msg id ?)
                    foreach (new \RecursiveIteratorIterator($msg) as $part) {
                        try {
                            if (strtok($part->contentType, ';') == 'text/plain') {
                                $txt = $part->getContent();
                                if ($txt && $txt != '' && !$bodyText) {
                                    $bodyText = $txt;
                                }
                            }
                            if (strtok($part->contentType, ';') == 'text/html') {
                                $bodyHTML = $part->getContent();
                                if ($bodyHTML && $bodyHTML != '') break;
                            }
                        } catch (\Throwable $e) {
                            $app['logger']->error("Fail to load message part"
                            , ['part' => $part, 'msg' => $msg]);
                        }
                    }
                    $body = $bodyHTML ?? $bodyText ?? '';
                } else {
                    $body = $msg->getContent(); // TODO : may be get content only iframe load + make iframe load on collapse event of title item
                }
                // Previous get content did change email flag, we do not want to flag for now
                // so restore initial flags :
                $this->storage->setFlags($imapId, $msgFlags ?? []);
                $msgBody = quoted_printable_decode($body);
                $app->updateByPath($editData, $bodyPath, $body);
                // TODO : edit store lock ?? what if multiple save same time ?
                $self->storeInCache($self->getUserDataStoreKey(), $editData);
            }
            // $msgBody = preg_replace([
            //     '/<html*>/', '/<\/html>/'
            // ], ['', ''], $msgBody);
            // $msgBody = preg_replace(['/<html.*>/', '/<\/html>/'
            // , '/<head.*>/', '/<body.*>/', '/<\/body>/'],
            // ['', '', '', '', ''], $msgBody);
            // $msgHead = "<head></head>";
            // $msgBody = explode('</head>', $msgBody);
            // if (count($msgBody) > 1) {
            //     //$msgHead = "<head>" . $msgBody[0] . "</head>";
            //     $msgHead = $msgBody[0];
            //     $msgBody = $msgBody[1];
            // } else {
            //     $msgBody = $msgBody[0];
            // }
            // http://www.aaronpeters.nl/blog/iframe-loading-techniques-performance?%3E#dynamic
            // To avoid iframe blocking main page load : load quick, then use JS
            // to append resulting contents
            // TODO : have loading indicator take iframe space until succed to load or err msg if fail
            $body = "<html>
            <head>
            <script type='text/javascript'>
            function loadData() {
                var d = document;d.getElementsByTagName('head')[0].
                appendChild(d.createElement('script')).innerHTML =
                'document.open();'
                + 'document.write(JSON.parse(decodeURIComponent('
                + '  \"" . rawurlencode(json_encode($msgBody)) . "\"'
                + ')));'
                + 'document.close();';
                // 'var html = document.getElementsByTagName(\"html\")[0];'
                // + 'html.innerHTML = JSON.parse(decodeURIComponent('
                // + '  \"" . rawurlencode(json_encode($msgBody)) ."\"'
                //+ '));';
            }
            </script>
            </head>
            <body onload='loadData()' " .
            // "var head = document.getElementsByTagName('head')[0];" .
            // "head.innerHTML = JSON.parse(decodeURIComponent(" .
            // "  '" . rawurlencode(json_encode($msgHead)) ."'" .
            // '));' .
            // "var body = document.getElementsByTagName('body')[0];" .
            // "body.innerHTML = JSON.parse(decodeURIComponent(" .
            // "  '" . rawurlencode(json_encode($msgBody)) ."'" .
            // '));' .
            '>' .
            '</body></html>';
            $resp = new Response($body , 200);
            $resp->headers->set('Content-Type', 'text/html');
            $self->actionResponse = $resp;
        } else if ('auth' === $action) {
            // Comming back from secured auth with Auth token (already handled by JWT...)
        } else {
            $success = parent::handleAction($action, $param);
        }
        return $success;
    }
    public function updateGeneratedData() {
        $self = $this;
        $app = $self->app;
        $data = $app["{$self->dataset_id}"];
        unset($app["{$self->dataset_id}"]);
        $self->initDefaultAugmentedData($data);
        // * DEBUG
        $app['logger']->debug('Imap Did Update Generated Data');
        // */
        $app["{$self->dataset_id}"] = $data;
    }
    protected function initDefaultAugmentedData(&$data) {
        // Init for augmented data :
        $augmentedDataKeys = [
            "MailsByExpeditor",
        ];
        foreach ($augmentedDataKeys as $key) {
            if (!array_key_exists($key, $data)) {
                $data[$key] = [];
            }
        }
    }
    public function transformData($dataProvider, $forcePictReload) {
        $self = $this;
        $app = $self->app;
        $data = $app["{$self->dataset_id}"];
        $self->initDefaultAugmentedData($data);
        // * DEBUG
        $app['logger']->debug('Imap Data Did transform Data');
        // */
        // $locale = $app['locale'];//$app['translator']->getLocale();
        // $app['cache']->store("data_$locale", $data);
    }
}