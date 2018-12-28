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

    protected function setDataUserToken($apiUsername, $dataUsername, $accessToken) {
        $self = $this;
        $app = $self->app;
        $apiUsers = $app['session']->get('apiUsers', []);
        $localUser = $apiUsers[$apiUsername]['dataUsers'][$dataUsername];
        $localUser['accessToken'] = $accessToken;
        $apiUsers[$apiUsername]['dataUsers'][$dataUsername] = $localUser;
        $app['session']->set('apiUsers', $apiUsers);
        $app['log.review']->debug(
            "Did update token for $apiUsername as $dataUsername : "
            , ["token" => $accessToken]// , $app->obfuskData(['users'=>$apiUsers])
        );
    }

    protected function setupActionToDevInProgress() {
        $self = $this;
        $app = $self->app;
        $status = [
            'errors' => [["Code under dev.", "Give a donnation with mention : "
            . "'MoonBoxDev-FailBodyFetch' for www.monwoo.com to improve it."]],
        ];
        $self->actionResponse = $app->json([
            'status' => $status,
        ]);
        // Set content type as html to avoid Client side webbrowser
        // auto-interpretation of json request outputing it with js toSting
        // showing 'objects' instead of string content.... :
        $self->actionResponse->headers->set('Content-Type', 'text/html');
        return true;
    }

    protected function handleAction($action, $param) {
        $self = $this;
        $app = $self->app;
        $request = $app['request_stack']->getCurrentRequest();
        $locale = $app['locale'];
        $success = true;
        $self->context = [];
        $self->actionResponse = null;
        $credentialPath = $app[
            "{$self->dataset_id}.credentialFile"
        ];

        $client = new \Google_Client();
        $client->setAuthConfig($credentialPath);

        if ('auth' === $action) {
            $statePayload = rawurldecode($request->get('state')); // TODO : real generated token state ?
            // Comming back from secured auth with Auth token
            // TODO : need to store token in session linked to last used session ID....
            $dataByAuthStates = $app['session']->get('apiDataByAuthStates', []);
            $data = $dataByAuthStates["$statePayload"];
            if (!$data) {
                throw new \Exception("Auth Issue");
            }
            //unset($dataByAuthStates["$statePayload"]);
            $dataByAuthStates = $app['session']->set('apiDataByAuthStates', $dataByAuthStates);

            $code = $request->get('code');
            // $app->assert($code,
            // "Auth Token must be difined on Api returns");
            $app['log.review']->debug('Did get Auth2 token', [$code]);
            $accessToken = $client->fetchAccessTokenWithAuthCode($code);
            if (array_key_exists('access_token', $accessToken)) {
                $self->setDataUserToken($data['apiUsername'], $data['localUsername'], $accessToken);
                $app['monolog']->debug('Auth2 access OK', [
                    'accessToken' => $accessToken,
                ]);
            } else {
                $app['monolog']->error('Did fail google api access',
                $accessToken);
                $self->setDataUserToken($data['apiUsername'], $data['localUsername'], false);
            }

            // $self->actionResponse = $app->json([
            //     'message' => "Dev in progress.",
            //     'localUser' => $app->obfuskData($localUser),
            //     'apiUsers' => $app->obfuskData($apiUsers),
            //     'data' => $data,
            // ]);

            $body = "<html>
            <head>
            <script src='https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js'></script>
            <script id='boot-script' data-frontend-baseurl='{$app["frontEndBaseUrl"]}' type='text/javascript'>
            " . file_get_contents(__DIR__ . '/GApiAuthResponse.js') . "
            </script>
            </head>
            <body>
            <img src='{$app["frontEndBaseUrl"]}/assets/simple-pre-loader/images/loader-128x/Preloader_3.gif'></img>
            </body></html>";
            $self->actionResponse = new Response($body , 200);
            $self->actionResponse->headers->set('Content-Type', 'text/html');
              
            return true;
        }

        $token = $app['security.token_storage']->getToken();
        $apiUser = $token->getUser();
        $dataUsername = $request->get('username');
        $apiUsers = $app['session']->get('apiUsers', []);
        $localUsers = $apiUsers[$apiUser->getUsername()]['dataUsers'];
        
        $localUser = $localUsers[$dataUsername];
        $app['log.review']->debug("Did load userData : ", $app->obfuskData([
            $localUser
        ]));
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
            $app['log.review']->debug("{$self->dataset_name} Connector not stable : " . $localUser['connector']);
            $status = [
                'errors' => [["{$self->dataset_name} Connector not stable", $localUser['connector']]],
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
            'credentials' => $credentialPath,
        ]);

        // Work in progress, done by Miguel Monwoo,

        // TODO : work in progress
        // Inspired from MonwooMarket/silexDemo/src/MonwooConnector/Provider/ImapDataProvider.php
        // $langGen = $app['locale.url_generator'];
        // $redirect_uri = $langGen->generate($locale,
        // $self->actionRouteName(), [
        //     'action' => 'auth',
        // ], UrlGeneratorInterface::ABSOLUTE_URL);
        $redirect_uri = $app->url($self->actionRouteName(), [
            'action' => 'auth',
        ]);

        $client->setRedirectUri($redirect_uri);
        $client->addScope(\Google_Service_Gmail::GMAIL_READONLY); // For gapi connections
        // $client->addScope(\Google_Service_Gmail::MAIL_GOOGLE_COM); // For google imap connections : https://mail.google.com/
        // $client->setApplicationName("Monwoo Imap Data Connector");
        $client->setApplicationName("MoonBox Connector by Monwoo");
        $client->setPrompt('select_account consent');
        $client->setAccessType('offline');
        // TODO : Can have only one gapi account access for now, ok, only need one gmail and multiple regular imap account for now
        // TODO : need improve design to handle access_token by connection
        // and find a way to iterate over connextion loading with auth system
        // in the middle...
        $accessToken = $localUser['accessToken']; // $self->getSession('access_token'); // Better secu if from file than from session ? well, token is already random generated stuff
        // var_dump($localUser); exit('==');
        // $accessToken = false; // TODO : have a way to manually reset accessToken & mail cache
        if (isset($accessToken['access_token'])) {
            $client->setAccessToken($accessToken);
            if ($client->isAccessTokenExpired()) {
                $refreshToken = $client->getRefreshToken();
                if ($refreshToken) {
                    $client->fetchAccessTokenWithRefreshToken($refreshToken);
                    $accessToken = $client->getAccessToken();
                    if (isset($accessToken['access_token'])) {
                        // $self->setSession('access_token', $accessToken);
                        $self->setDataUserToken($accessToken['access_token']);
                    } else {
                        // * DEBUG
                        $app['log.review']->debug('Refresh Access token fail', [
                            'accessToken' => $accessToken,
                        ]);
                        // */
                        $accessToken = false;
                    }
                } else {
                    // * DEBUG
                    $app['log.review']->debug('Fetching Refresh Access token fail', [
                        'accessToken' => $accessToken,
                    ]);
                    // */
                    $accessToken = false;
                }
            }
        } else {
            // * DEBUG
            $app['log.review']->debug('Last saved Access token is badly build', [
                'accessToken' => $accessToken,
            ]);
            // */
            $accessToken = false;
        }
        if (!$accessToken) {
            // Need re-auth action to get access token OK
            $authAccessTotalCount = $app['session']->get('authAccessTotalCount', 1);
            $app['session']->set('authAccessTotalCount', $authAccessTotalCount + 1);
            $dataByAuthStates = $app['session']->get('apiDataByAuthStates', []);
            $statePayload = $authAccessTotalCount; // rawurlencode($authAccessTotalCount);
            $dataByAuthStates["$statePayload"] = [
                'apiUsername' => $token->getUsername(),
                'localUsername' => $dataUsername,
            ];
            $app['session']->set('apiDataByAuthStates', $dataByAuthStates);
            $client->setState("$statePayload");
            $authUrl = $client->createAuthUrl();

            // $statePayload = rawurlencode($localUser['username']); // TODO : real generated token state ?
            // Well username do not need to be Gid, so payload ok for now...
            // $self->actionResponse = $app->redirect($authUrl);
            $self->actionResponse = $app->json([
                'needAuthRedirect' => true,
                'redirect' => $authUrl,
            ]);
            return true; // We did consume the required action, need G Api access
        }

        /////////// Access token is valid //////////
        $service = new \Google_Service_Gmail($client);
        $user = 'me';


        $self->context['dataProvider'] = $self;
        $order_by = $request->get('order_by') ?: 'time'; // TODO : use it ? no way on ids for now...
        $order_dir = $request->get('order_dir') == 'DESC' ? 'DESC' : 'ASC';
        $limit = (int)($request->get('limit') ?: 20);
        $page = ($request->get('page') ?: 1);
        // $offset = ($page - 1) * $limit;
        // $self->offsetStart = $offset;
        $self->offsetLimit = $limit;
        $msgsByIds = $self->fetchFromCache($self->getUserDataStoreKey() . $localUser['username'], []);

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

            // TODO : allow multiple connection ? comming from code refactoring,
            // having only one connection and multiples apiUser with multiples users
            if (count($connections) > 1) {
                $app['log.review']->error("Algo not ready for multiples connections");
            }
            foreach ($connections as $connectionName => $connection) {
                try {
                    // Print the labels in the user's account.
                    // https://developers.google.com/gmail/api/v1/reference/users/labels#resource
                    // https://developers.google.com/gmail/api/quickstart/php
                    // https://github.com/googleapis/google-api-php-client-services/blob/a016ea7b6d47e1fd1f43d89ebd80059d4bfadb32/src/Google/Service/Gmail/Label.php
                    // https://github.com/googleapis/google-api-php-client-services/blob/a016ea7b6d47e1fd1f43d89ebd80059d4bfadb32/src/Google/Service/Gmail/LabelColor.php
                    // https://developers.google.com/resources/api-libraries/documentation/gmail/v1/php/latest/
                    // https://developers.google.com/gmail/api/v1/reference/
                    $results = $service->users_labels->listUsersLabels($user);

                    $folders = [];
                    if (count($results->getLabels()) == 0) {
                        $app['log.review']->debug("No labels found");
                    } else {
                        foreach ($results->getLabels() as $label) {
                            // $app['log.review']->debug("Label found : ", [$label]);
                            $loadedFolder = [
                                'name' => $label->getName(),
                                'messageListVisibility' => strval($label->getMessageListVisibility()),
                                'labelListVisibility' => strval($label->getLabelListVisibility()),
                                'type' => strval($label->getType()),
                                'messagesTotal' => strval($label->getMessagesTotal()),
                                'messagesUnread' => strval($label->getMessagesUnread()),
                                'color' => $label->getColor()  ? $label->getColor()->getTextColor() : '',
                                'bgColor' => $label->getColor() ? $label->getColor()->getBackgroundColor() : '',
                            ];
                            $folders[] = $loadedFolder;
                        }
                    }
        
                    // https://stackoverflow.com/questions/24503483/reading-messages-from-gmail-in-php-using-gmail-api
                    // https://developers.google.com/gmail/api/v1/reference/users/messages/list
                    // https://developers.google.com/gmail/api/v1/reference/users/messages/get
                    // http://techblog-mike.hateblo.jp/entry/2015/06/04/230602
                    // https://developers.google.com/gmail/api/v1/reference/users/messages/modify#php
                    // https://github.com/googleapis/google-api-php-client-services/search?q=getNextPageToken&unscoped_q=getNextPageToken

                    $listQuery = [];
                    $listQuery['maxResults'] = $limit; // Return Only 5 Messages
                    // $listQuery['labelIds'] = ['INBOX', 'SPAM']; // Only show messages in Inbox & same show no msg, bad ID format ? not label name ?
                    $listQuery['includeSpamTrash'] = true;
                    if ($page !== 1) {
                        $listQuery['pageToken'] = $page;
                    }
                    $query = '';
                    if (isset($localUser['periode'])
                    && isset($localUser['periode']['fetchStartStr'])
                    && $localUser['periode']['fetchStartStr']) {
                        $startDate = \DateTime::createFromFormat('Y/m/d',
                        $localUser['periode']['fetchStartStr'])
                        ->format('Y/M/d');
                        $query .= "after:$startDate ";
                    }
                    if (isset($localUser['periode'])
                    && isset($localUser['periode']['fetchEndStr'])
                    && $localUser['periode']['fetchEndStr']) {
                        $endDate = \DateTime::createFromFormat('Y/m/d',
                        $localUser['periode']['fetchEndStr'])
                        ->format('Y/M/d');
                        $query .= "before:$endDate ";
                    }
                    if (isset($localUser['params'])
                    && isset($localUser['params']['keywordsSubject'])
                    && count($localUser['params']['keywordsSubject']) > 0) {
                        $keywords = implode($localUser['params']['keywordsSubject'], " ");
                        $query .= "subject:($keywords) ";
                    }
                    if (isset($localUser['params'])
                    && isset($localUser['params']['keywordsBody'])
                    && count($localUser['params']['keywordsBody']) > 0) {
                        $keywords = implode($localUser['params']['keywordsBody'], " ");
                        $query .= "$keywords ";
                    }
                    if (isset($localUser['params'])
                    && isset($localUser['params']['avoidwords'])
                    && count($localUser['params']['avoidwords']) > 0) {
                        $keywords = implode($localUser['params']['avoidwords'], " ");
                        $query .= "-\{$keywords\} ";
                    }
                    if ("" !== $query) {
                        $listQuery['pageToken'] = $query;
                    }

                    $app['log.review']->debug("Gapi Query : ", $listQuery);
                    // https://stackoverflow.com/questions/24503483/reading-messages-from-gmail-in-php-using-gmail-api
                    // https://developers.google.com/gmail/api/v1/reference/users/messages/modify#php
                    // https://developers.google.com/gmail/api/v1/reference/users/messages
                    // https://github.com/googleapis/google-api-php-client-services/blob/a016ea7b6d47e1fd1f43d89ebd80059d4bfadb32/src/Google/Service/Gmail/Resource/UsersMessages.php
                    // https://github.com/googleapis/google-api-php-client-services/blob/a016ea7b6d47e1fd1f43d89ebd80059d4bfadb32/src/Google/Service/Gmail/ListMessagesResponse.php
                    $messages = $service->users_messages->listUsersMessages($user,$listQuery);
                    $list = $messages->getMessages();
                    // $messageId = $list[0]->getId(); // Grab first Message
                    if ("ASC" === $order_dir) { // + TODO : need to rewrite query ?? not used for v1.0.0 demo
                        $list = array_reverse($list);
                    }
                    $numResults += count($list);
                    $totalCount += $messages->getResultSizeEstimate();
        
                    foreach ($list as $shadowMsg) {
                        $msgQueryId = $shadowMsg->getId();
                        $fetchQuery = [
                            'format' => 'metadata'
                        ];
                        try {
                            $message = $service->users_messages->get($user, $msgQueryId, $fetchQuery);
                            $headers = [];
                            foreach ($message->getPayload()->getHeaders() as $header) {
                                // $headers[] = $header->toString();
                                // or grab values: $header->getFieldName(), $header->getFieldValue()
                                $headers[$header->getName()] = $header->getValue();
                            }
                            $subject = $headers["Subject"];//$message->subject;//htmlentities($message->subject);
                            $msgFlags = "TODO";//$message->getFlags();

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
                                'labels' => $message->getLabelIds(),
                                'expeditorFullName' => $expeditorFullName,
                                'expeditorMainAnswerBox' => $expeditorMainAnswerBox,
                                'subject' => $subject,
                                'msgFlags' => $msgFlags,
                                // Computed on demand with next action :
                                // 'body' => $body, // htmlentities($message->getBody()),
                                'localTime' => $localTime, //$msgHeaders->getInternalDate(), // will be used for timeline ordering
                                // 'headers' => Yaml::dump($headers, 4),
                                'headers' => $headers,
                                'expeditor' => $expeditor,
                                'timestamp' => $timestamp, //$msgHeaders->getInternalDate(), // will be used for timeline ordering
                                // 'to' => $message->getTo(),
                                // 'replyTo' => $message->getReplyTo(), // TODO getReplyTo
                                'to' => isset($headers['To']) ? $headers['To'] : '',
                                // : (isset($headers['Reply-To']) ? $headers['Reply-To'] : ''),
                                // 'cc' => $message->getCc(), // isset($headers['Cc']) ? $headers['Cc'] : '',
                                // 'bcc' => $message->getBcc(), // isset($headers['Bcc']) ? $headers['Bcc'] : '',
                                'cc' => isset($headers['Cc']) ? $headers['Cc'] : '',
                                'bcc' => isset($headers['Bcc']) ? $headers['Bcc'] : '',
                                'tags' => '', // [], // : TODO : load from cache, build with key index as : "$expeditor.$msgId"
                                // 'msg' => $msgPayload, // TODO : Normalized Mail message to display summary in ui + id for fetching
                                'msgId' => $msgId,
                                'msgUniqueId' => $msgQueryId,
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
                ['iframeBody'] = $self->iframeBuilder(
                    $dataUsername,
                    "{$msg['connectionName']}<|>[{$msg['msgUniqueId']}][body]"
                );
                $msgsByIds[$msg['msgUniqueId']] = $msg;
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

            $self->storeInCache($self->getUserDataStoreKey() . $localUser['username'], $msgsByIds);
            $app['log.review']->debug("Storing Msg Ids : " . $msgUniqueIdPath, $app->obfuskData([$msgsByIds]));
            // TODO : refactor saved data model to be extendable object ?
            // $msgsOrderedByDate->numResults = $numResults;
            $self->actionResponse = $app->json([
                'status' => $status,
                'numResults' => $numResults,
                'msgsOrderedByDate' => $msgsOrderedByDate,
                'msgsByMoonBoxGroup' => $msgsByMoonBoxGroup,
                'totalCount' => $totalCount,
                // 'offsetStart' => $self->offsetStart,
                'offsetLimit' => $self->offsetLimit,
                'currentPage' => $page,
                'nextPage' => $messages->getNextPageToken(),
                // 'nextPage' => ($self->offsetStart + $numResults < $totalCount) ? $page + 1 : null,
            ]);
        } else if ('msg_body' === $action) { // TODO: why not protected by JWT ? Only by php session id for now...
            $params = explode('<|>', $param);
            $connections = $self->defaultConfig["connections"];
            $connection = $connections[$params[0]];
            $bodyPath = $params[1];

            // TODO : realy slow for each iframe rendering.
            // May be store needed data in session to speed up iframe load ?
            // May be it load each frame with debug info system (can see multiple call for each frames)
            $msgsByIds = $self->fetchFromCache($self->getUserDataStoreKey() . $localUser['username']);
            $msgBody = $app->fetchByPath($msgsByIds, $bodyPath);

            if (!$msgBody) {
                $bodyText = null;
                $bodyHTML = null;

                $fetchQuery = [
                    'format' => 'full',
                ];
                // * DEBUG
                $app['log.review']->debug("Loading content at $bodyPath for {$connection['username']}",
                $app->obfuskData([
                    'msgs' => $msgsByIds,
                    'msg' => $app->fetchByPath($msgsByIds,
                    str_replace('[body]', '', $bodyPath)),
                    'connection' => $connection,
                    // 'msgIds' => $msgIds,
                ]));
                // */
                $msgUniqueIdPath = str_replace('[body]', '[msgUniqueId]', $bodyPath);
                $msgUniqueId = $app->fetchByPath($msgsByIds, $msgUniqueIdPath);
                if (!$msgUniqueId) {
                    $app['log.review']->debug("Fail to fetch : " . $msgUniqueIdPath, $app->obfuskData([$msgsByIds]));
                    // return $self->setupActionToDevInProgress();
                    $self->setDataUserToken($apiUser->getUsername(), $connection['username'], false);
                    $self->actionResponse = $app->redirect($app->url($self->actionRouteName(), [
                        'action' => $action,
                        'param' => $param,
                    ]));
                    return true;
                }

                $message = $service->users_messages->get($user, $msgUniqueId, $fetchQuery);
                $app['log.review']->assert($message,
                "Loading msg $msgUniqueId for {$connection['username']} FAIL");

                $headers = [];
                foreach ($message->getPayload()->getHeaders() as $header) {
                    // $headers[] = $header->toString();
                    // or grab values: $header->getFieldName(), $header->getFieldValue()
                    $headers[$header->getName()] = $header->getValue();
                }
                $subject = $headers["Subject"];//$message->subject;//htmlentities($message->subject);
                // $msgFlags = "TODO";//$message->getFlags();
                // https://stackoverflow.com/questions/24503483/reading-messages-from-gmail-in-php-using-gmail-api
                // => there is no msgFlags in GmailApi, done with Label : UNREAD

                // TODO : use Carbon/Date ?
                // https://stackoverflow.com/questions/13421635/failed-to-parse-time-string-at-position-41-i-double-timezone-specification
                $dateStr = substr($headers['Date'], 0, 31);
                $msgDateTime = new \DateTime($dateStr);
                $timestamp = $msgDateTime->getTimestamp();
                $localTime = $msgDateTime->format('Y/m/d H:i');
                // $msgsSummary[] = [
                //     'headers' => $headers,
                // https://stackoverflow.com/questions/24503483/reading-messages-from-gmail-in-php-using-gmail-api
                function base64url_decode($data) {
                    return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
                }
                function getBody($dataArr) {
                    $outArr = [];
                    foreach ($dataArr as $key => $val) {
                        if (0 === $key) {
                            $outArr[] = base64url_decode($val->getBody()->getData());
                        } else {
                            $rawData = $val->getBody()->getData();
                            $rawData = str_replace('!!binary ', '', $rawData);
                            $outArr[] = quoted_printable_decode(base64_decode($rawData));
                        }
                        // we want html fist, text failback otherwise... 
                        // break; // we are only interested in $dataArr[0]. Because $dataArr[1] is in HTML.
                    }
                    return $outArr;
                }
                
                try {
                    $bodyArr = getBody($message->getPayload()->getParts());
                    // $bodyArr[0] => Text
                    // $bodyArr[1] => HTML
                    $body = $bodyArr[1] ?? $bodyArr[0] ?? '';
                    $isText = !$bodyArr[1];
                    $msgBody = $isText ? "<pre>$body</pre>" : $body;
                    $app['log.review']->debug("Body content : ", [
                        // 'src' => $bodyArr,
                        'output' => substr($msgBody, 0, 125),
                        'path' => $bodyPath,
                        'msgsByIds' => array_keys($msgsByIds), // $app->obfuskData($msgsByIds),
                    ]);
    
                    $app->updateByPath($msgsByIds, $bodyPath, $msgBody);
                    // TODO : edit store lock ?? what if multiple save same time ?
                    $self->storeInCache($self->getUserDataStoreKey() . $localUser['username'], $msgsByIds);    
                } catch (\Throwable $e) {
                    $app['log.review']->error("Fail to load message part"
                    , ['part' => $message->getPayload()->getParts(), 'msg' => $message]);
                }
            }
            // $body = "<html>
            // <head>
            // <script type='text/javascript'>
            // function loadData() {
            //     var d = document;d.getElementsByTagName('head')[0].
            //     appendChild(d.createElement('script')).innerHTML =
            //     'document.open();' //   document.open('text/plain');
            //     + 'document.write(JSON.parse(decodeURIComponent('
            //     + '  \"" . rawurlencode(json_encode($msgBody)) . "\"'
            //     + ')));'
            //     // + 'document.close();';
            //     // 'var html = document.getElementsByTagName(\"html\")[0];'
            //     // + 'html.innerHTML = JSON.parse(decodeURIComponent('
            //     // + '  \"" . rawurlencode(json_encode($msgBody)) ."\"'
            //     //+ '));';
            // }
            // </script>
            // </head>
            // <body onload='loadData()' " .
            // // "var head = document.getElementsByTagName('head')[0];" .
            // // "head.innerHTML = JSON.parse(decodeURIComponent(" .
            // // "  '" . rawurlencode(json_encode($msgHead)) ."'" .
            // // '));' .
            // // "var body = document.getElementsByTagName('body')[0];" .
            // // "body.innerHTML = JSON.parse(decodeURIComponent(" .
            // // "  '" . rawurlencode(json_encode($msgBody)) ."'" .
            // // '));' .
            // '>' .
            // '</body></html>';
            $body = rawurlencode(json_encode($msgBody));
            
            $resp = new Response($body , 200);
            $resp->headers->set('Content-Type', 'text/html');
            $self->actionResponse = $resp;
        } else {
            $success = parent::handleAction($action, $param);
        }
        return $success;
    }
}
