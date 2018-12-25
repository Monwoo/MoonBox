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
use Defuse\Crypto\Crypto;
use Defuse\Crypto\KeyProtectedByPassword;

use Monwoo\Middleware\MonwooDataEventsMiddleware;
use JasonGrimes\Paginator;
use \Ds\Vector;

class GApiDataProvider extends ImapDataProvider
{
    protected function init() {
        $self = $this;
        $self->dataset = [];
        $self->stableConnectors = new Vector([
            'GoogleApi',
        ]);
        $self->dataset_name = 'GApiData';
        $self->dataset_id = 'data_gapi';
    }

    /**
    * {@inheritdoc}
    */
    public function register(Container $app) {
        parent::register($app);
        $self = $this;
    }

    protected function handleAction($action, $param) {
        $self = $this;
        $app = $self->app;
        $request = $app['request_stack']->getCurrentRequest();
        $locale = $app['locale'];
        $success = true;
        $self->context = [];
        $self->actionResponse = null;

        $token = $app['security.token_storage']->getToken();
        $apiUser = $token->getUser();
        $dataUsername = $request->get('username');
        $apiUsers = $app['session']->get('apiUsers', []);
        $localUsers = $apiUsers[$apiUser->getUsername()]['dataUsers'];
        
        $localUser = $localUsers[$dataUsername];
        if (!$localUser) {
            $app['log.review']->debug("Unknown userData : " . $dataUsername, [
                'apiUser' => $apiUser->getUsername(),
                'localUsers' => $app->obfuskData($localUsers),
            ]);
            $status = [
                'errors' => [["Unknown userData", $dataUsername]],
            ];
            $self->actionResponse = $app->json([
                'message' => "A Token was not found in the TokenStorage."
                //'status' => $status,
            ]);
            return true;
        }

        if (!$self->stableConnectors->contains($localUser['connector'])) {
            $app['log.review']->debug("ImapData Connector not stable : " . $localUser['connector']);
            $status = [
                'errors' => [["ImapData Connector not stable", $localUser['connector']]],
            ];
            $self->actionResponse = $app->json([
                'status' => $status,
                'numResults' => 0,
                'msgsOrderedByDate' => [],
                'msgsByMoonBoxGroup' => [],
                'totalCount' => 0,
                'offsetStart' => 0,
                'offsetLimit' => 0,
                'currentPage' => 0,
                'nextPage' => 0,
            ]);
            return true;
        }

        $self->defaultConfig = [
            'connections' => [
              'serviceEmail' => [
                  'username' => $localUser['username'],
              ],
          ],
        ];
        $app['log.review']->debug("GoogleApiData $action : ", [
            'conf' => $app->obfuskData($self->defaultConfig),
            'apiUserName' => $token->getUsername(),
        ]);

        // Work in progress, done by Miguel Monwoo,

        // TODO : work in progress
        // Inspired from MonwooMarket/silexDemo/src/MonwooConnector/Provider/ImapDataProvider.php

        $client = new \Google_Client();
        $client->setAuthConfig($app[
            "{$self->manager_route_name}.gapi_credential"
        ]);
        $client->setRedirectUri($redirect_uri);
        $client->addScope(\Google_Service_Gmail::GMAIL_READONLY); // For gapi connections
        // $client->addScope(\Google_Service_Gmail::MAIL_GOOGLE_COM); // For google imap connections : https://mail.google.com/
        // $client->setApplicationName("Monwoo Imap Data Connector");
        $client->setApplicationName("MoonBox Connector by Monwoo");
        $client->setAccessType('offline');
        // TODO : Can have only one gapi account access for now, ok, only need one gmail and multiple regular imap account for now
        // TODO : need improve design to handle access_token by connection
        // and find a way to iterate over connextion loading with auth system
        // in the middle...
        $accessToken = $self->getSession('access_token'); // Better secu if from file than from session ? well, token is already random generated stuff
        // $accessToken = false; // TODO : have a way to manually reset accessToken & mail cache
        if (isset($accessToken['access_token'])) {
            $client->setAccessToken($accessToken);
            if ($client->isAccessTokenExpired()) {
                $refreshToken = $client->getRefreshToken();
                if ($refreshToken) {
                    $client->fetchAccessTokenWithRefreshToken($refreshToken);
                    $accessToken = $client->getAccessToken();
                    if (isset($accessToken['access_token'])) {
                        $self->setSession('access_token', $accessToken);
                    } else {
                        // * DEBUG
                        $app['debug.logger']->debug('Refresh Access token fail', [
                            'accessToken' => $accessToken,
                        ]);
                        // */
                        $accessToken = false;
                    }
                } else {
                    // * DEBUG
                    $app['debug.logger']->debug('Fetching Refresh Access token fail', [
                        'accessToken' => $accessToken,
                    ]);
                    // */
                    $accessToken = false;
                }
            }
        } else {
            // * DEBUG
            $app['debug.logger']->debug('Last saved Access token is badly build', [
                'accessToken' => $accessToken,
            ]);
            // */
            $accessToken = false;
        }

        $self->context['dataProvider'] = $self;
        $order_by = $request->get('order_by') ?: 'time'; // TODO : use it ? no way on ids for now...
        $order_dir = $request->get('order_dir') == 'DESC' ? 'DESC' : 'ASC';
        $limit = (int)($request->get('limit') ?: 20);
        $page = (int)($request->get('page') ?: 1);
        $offset = ($page - 1) * $limit;
        $self->offsetStart = $offset;
        $self->offsetLimit = $limit;
        if ('submit_refresh' === $action) {
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
            // var_dump($connections); exit();
            foreach ($connections as $connectionName => $connection) {
                try {
                    $self->connectToGmail($connection, $accessToken);
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
                    if ("ASC" === $order_dir) {
                        $msgIds = array_reverse($msgIds);
                    }
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
                            // TODO : use Carbon/Date ?
                            // https://stackoverflow.com/questions/13421635/failed-to-parse-time-string-at-position-41-i-double-timezone-specification
                            $dateStr = substr($headers['Date'], 0, 31);
                            $msgDateTime = new \DateTime($dateStr);
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
                            $app['log.review']->error("Fail to load Imap {$connection['username']}"
                            , [$errMsg, $errPos, $errTrace]);
                            array_push($status['errors'], $errMsg);
                        }
                    }
                    $status['folders'] = $folders;
                    // * DEBUG
                    $app['log.review']->debug("Did open MailBox {$connection['username']}", [
                        'mailBoxFolders' => $folders,
                        'totalCountOfMsg' => $totalCountOfMsg,
                        // 'msgsOrderedByDate' => $msgsOrderedByDate,
                        'imapQuery' => $imapQuery,
                    ]);
                    // */
                } catch (\Throwable $e) {
                    $errMsg = 'Exception '.get_class($e).': '.$e->getMessage();
                    $errPos = $e->getFile().':'.$e->getLine();
                    $errTrace = $e->getTrace();
                    $errTitle = "Fail to load Imap {$connection['username']}";
                    // $app['session']->getFlashBag()->add('error'
                    // , "Faild to load Imap {$connection['username']}");
                    $app['log.review']->error($errTitle
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
                    $dataUsername,
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
                $app['log.review']->debug("Loading content at $bodyPath for {$connection['username']}",
                $app->obfuskData([
                    'msg' => $app->fetchByPath($editData,
                    str_replace('[body]', '', $bodyPath)),
                    'connection' => $connection,
                    // 'msgIds' => $msgIds,
                ]));
                // */
                $msgUniqueIdPath = str_replace('[body]', '[msgUniqueId]', $bodyPath);
                $msgUniqueId = $app->fetchByPath($editData, $msgUniqueIdPath);
                if (!$msgUniqueId) {
                    $app['log.review']->debug("Fail to fetch : " . $msgUniqueIdPath, $app->obfuskData([$editData]));
                    $status = [
                        'errors' => [["Code under dev.", "Give a donnation with mention : "
                        . "'MoonBoxDev-FailBodyFetch' for www.monwoo.com to improve it."]],
                    ];
                    $self->actionResponse = $app->json([
                        'status' => $status,
                        'numResults' => 0,
                        'msgsOrderedByDate' => [],
                        'msgsByMoonBoxGroup' => [],
                        'totalCount' => 0,
                        'offsetStart' => 0,
                        'offsetLimit' => 0,
                        'currentPage' => 0,
                        'nextPage' => 0,
                    ]);
                    return true;        
                }
                $imapId = $this->storage->getNumberByUniqueId($msgUniqueId);
                // the imapId stored in msg is linked to search query, need to use the msgUniqueId instead
                // $imapIdPath = str_replace('[body]', '[imapId]', $bodyPath);
                // $imapId = $app->fetchByPath($editData, $imapIdPath);
                $msg = $this->storage->getMessage(intval($imapId));
                $app['log.review']->assert($msg,
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
                            $app['log.review']->error("Fail to load message part"
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
            // Comming back from secured auth with Auth token
        } else {
            $success = parent::handleAction($action, $param);
        }
        return $success;
    }
}