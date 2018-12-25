<?php
// Copyright Monwoo 2018, by Miguel Monwoo, service@monwoo.com

require_once __DIR__ . '/vendor/autoload.php';

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\RequestMatcher;
use Symfony\Component\HttpKernel\Profiler\Profiler;
use Symfony\Component\HttpKernel\Log\Logger as ConsoleLogger;
use Symfony\Component\Security\Core\Exception\UsernameNotFoundException;
use Symfony\Component\Security\Core\User\InMemoryUserProvider;
use Symfony\Component\Security\Core\User\User;
use Symfony\Component\Yaml\Yaml;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\PropertyAccess\PropertyAccess;
use Symfony\Bridge\Monolog\Processor\DebugProcessor;
use Monolog\Logger;
use Monolog\Handler as MH;
use Bramus\Monolog\Formatter\ColoredLineFormatter;

use Psr\Log\LogLevel;

use Monwoo\Middleware\AddingCors;

$root_dir = $root_dir ?? __DIR__;
require_once __DIR__ . '/config.php';
$prodDebug = $prodDebug ?? false;

// DEBUG MediumRisk, un-cmt for prod
$prodDebug = false; // Un-comment this line to disallow prodDebug feature showing sensitive datas

$app = new class([
    'randSeedSize' => 2,
    'randSeedInit' => function ($seed) {
        return 1;
    },
    'randSeedFreq' => function ($seed) {
        return $seed + 1;
    },
    'debug' => $prodDebug || $config['debug'],
    'prodDebug' => $prodDebug,
    'log.review' => new class($config['loggerName']) extends \Monolog\Logger {
        public function assert($ok, $msg, $extra = null) {
            // TODO psySh => could break there ? XDebug ?
            $self = $this;
            if (!$ok) {
                $self->error($msg, $extra);
            }
        }
    },
    'sessionTimeOut' => $config['sessionTimeOut'],
    'authTimeOut' => $config['authTimeOut'],
    'root_dir' => $root_dir,
    'cache_dir' => $root_dir . '/cache/' . ($config['debug'] ? 'dev' : 'prod'),
    'accessor' => PropertyAccess::createPropertyAccessor(),
]) extends Silex\Application {
    use Silex\Application\UrlGeneratorTrait;

    public function obfuskData(&$src, $fields=["password"], $mask="*****") {
        $output = [];
        foreach ($src as $key => &$value) {
            if (in_array($key, $fields)) {
                $output[$key] = $mask;
            } else if (is_array($value)) {
                $output[$key] = $this->obfuskData($value, $fields);
            } else {
                $output[$key] = $value;
            }
        }
        return $output;
    }

    public function fetchByPath($fetchSrc, $path, $default = null) {
        $path = $this->applyPathTransformers($path);
        $val = $default;
        // isReadable will be true if array without key...
        // TODO : isWritable return true on array even if value is not in path...
        // var_dump($fetchSrc['accessor']->isReadable($fetchSrc, $path));
        if ($this['accessor']->isWritable($fetchSrc, $path)) {
            $val = $this['accessor']->getValue($fetchSrc, $path);
            // var_dump($path);
            // var_dump($val);
            if ($val === null) { // TODO : find bug of isWritable/isReadable, fixing null for now to make v1 works
                $val = $default;
            }
        }
        return $val;
    }

    public function updateByPath(&$fetchSrc, $path, $value, $forceAsArray = false) {
        $path = $this->applyPathTransformers($path);
        // TODO : isWritable return true on array even if value is not in path...
        // var_dump($fetchSrc['accessor']->isReadable($fetchSrc, $path));
        if ($this['accessor']->isWritable($fetchSrc, $path)) {
            $this['accessor']->setValue($fetchSrc, $path, $value);
            return $fetchSrc;
        } else if ($forceAsArray) {
            // TODO : Build path structure...
            // Quick hack since in our case, path is only Array path :
            $pathProps = new PropertyPath($path);
            $target = $fetchSrc;
            foreach ($pathProps->getElements() as $idx => $path_item) {
                if (!array_key_exists($path_item, $target)) {
                    $target[$path_item] = [];
                }
                $target = $target[$path_item];
            }
            $this['accessor']->setValue($fetchSrc, $path, $value);
            return $fetchSrc;
        }
        return null;
    }

    public function applyPathTransformers($path) {
        if (!$path) return null;
        $app = $this;
        $hexPattern = "/\[__HEX(.*)\]/";
        // $matches = [];
        // // handle __HEX transforms => replace by decoded hex
        // $matches = array_map(function($match) use ($self) {
        //     return $self->hexToStr($match);
        // }, $matches);
        return preg_replace_callback($hexPattern, function($matchs) use ($app) {
            return $app->hexToStr($matchs[1]);
        }, $path);
    }
};

// Early event register to avoid missing 'session' inside app...
$app->register(new Silex\Provider\SessionServiceProvider(), [
    'session.storage.options' => [
        // session life time in secondes
        'cookie_lifetime' => $app['sessionTimeOut'],
    ],
]);

$app->register(new Silex\Provider\MonologServiceProvider());

$logLvl = $app['debug'] ? Logger::DEBUG : Logger::ERROR;
$mySaveToFileHandler = new class ($app, $logLvl) extends MH\AbstractProcessingHandler {
    public function __construct($app, $level = Logger::DEBUG, $bubble = true) {
        parent::__construct($level, $bubble);
        $self = $this;
        $self->app = $app;
        $self->monologLvlToPsrLvl = [
            Logger::DEBUG     => LogLevel::DEBUG,
            Logger::INFO      => LogLevel::INFO,
            Logger::NOTICE    => LogLevel::NOTICE,
            Logger::WARNING   => LogLevel::WARNING,
            Logger::ERROR     => LogLevel::ERROR,
            Logger::CRITICAL  => LogLevel::CRITICAL,
            Logger::ALERT     => LogLevel::ALERT,
            Logger::EMERGENCY => LogLevel::EMERGENCY,
        ];
    }
    protected function write(array $record): void {
        $self = $this;
        $app = $self->app;
        $logPath = $app['cache_dir'] . '/logs.yml';
        $logs = [];
        $logs[] = $record;
        $fs = new Filesystem();
        $basePath = dirname($logPath);
        if (!is_dir($basePath)) {
            $fs->mkdir($basePath);
        }
        if ($record['level'] >= Logger::WARNING || $app['prodDebug']) {
            // Writting only warnings and errors to logs file
            // to avoid useless huges logs
            $dump = Yaml::dump($logs, 4);//, 4, Yaml::DUMP_OBJECT);
            $fs->appendToFile($logPath, $dump);
        }
        if (isset($app['consoleLogger'])) {
            // var_dump($record); exit;
            // var_dump($self->monologLvlToPsrLvl[$record['level']]); exit;
            $app['consoleLogger']->log($self->monologLvlToPsrLvl[
                $record['level'] // intval($record['level'])
            ], $record['message'], $record['context']);
        }
    }
};
// $app['logger']->pushHandler($mySaveToFileHandler);
// adapted by Miguel Monwoo from :
// Code/Prototype/src/Monwoo/CVVideo/CVApplication.php
$logLvl = $app['debug'] ? LogLevel::DEBUG : LogLevel::ERROR;
$app['logger']->pushHandler(new MH\RotatingFileHandler($app['cache_dir'] . '/logs.yml', 0,
$logLvl, true, 0644));
// var_dump(php_sapi_name()); exit;
// 'cli' from command, 'cli-server' from builtin php server
if (preg_match('/^cli/', php_sapi_name())) {
    $cliLogLvl = LogLevel::DEBUG;
    $colorCliHandler = new MH\StreamHandler('php://stdout'
    , $cliLogLvl);
    $colorCliHandler->setFormatter(new class()
    extends ColoredLineFormatter {
        // quickly customize ColoredLineFormatter to output yml with
        // new lines inside :
        public function convertToString($data) {
            $output = Yaml::dump($data, 4);
            return (substr_count($output, "\n" ) > 1) ? "\n$output" : $output;

        }
        public function replaceNewlines($str) {
            return $str;
        }
    });
    $app['logger']->pushHandler($colorCliHandler);
    $app['log.review']->pushHandler($colorCliHandler);
}
// $app['logger']->pushHandler(new \Monolog\Handler\SyslogHandler());
$mailHandler = new MH\NativeMailerHandler('dev@monwoo.com',
'MoonBox logger', 0, LogLevel::INFO); // Keep all INFO logs in buffer until error
// https://github.com/Seldaek/monolog/blob/master/src/Monolog/Handler/BufferHandler.php
$bufferHandler = new MH\BufferHandler($mailHandler, 1000);
$fingersCrossedHandler = new MH\FingersCrossedHandler($bufferHandler,
LogLevel::ERROR, 1000);
$app['logger']->pushHandler($fingersCrossedHandler);
// TODO : keep event in verry verbose mode only. to much useless info in console otherwise
// unset($app['monolog.listener']);
$app['logger']->pushHandler(new class() extends MH\NullHandler {
    public function handle(array $record)
    {
        // var_dump($record['channel']);// exit;
        // var_dump(strpos($record['message']
        // , 'Notified event "{event}" to listener "{listener}"'));// exit;
        // return $record['channel'] !== 'event';
        return strpos($record['message']
        , 'Notified event "{event}" to listener "{listener}"') === 0;
    }
});
// Review logger capabilities :
$app['log.review']->pushHandler(new MH\RotatingFileHandler($app['cache_dir'] . '/logs-review.yml', 0,
$logLvl, true, 0644));

// function_exists('xdebug_break') && \xdebug_break();

if ($app['debug']) {
    $app['logger']->pushProcessor(new DebugProcessor());
    $app['consoleLogger'] = new ConsoleLogger(LogLevel::DEBUG);
}
$app['log.review']->debug("Backend {Action}", ['Action' => "Init"]);

$appCacheDir = $app['cache_dir'] . '/app';
if (!is_dir($appCacheDir)) {
    $fs = new Filesystem();
    $fs->mkdir($appCacheDir);
}
$app->register(new Moust\Silex\Provider\CacheServiceProvider(), array(
    'cache.options' => array(
        'driver' => 'file',
        'cache_dir' => $appCacheDir
    )
));

$app['security.jwt'] = [
  'secret_key' => 'Very_secret_key',
  'life_time'  => $app['authTimeOut'],
  'options'    => [
      'username_claim' => 'username', // default name, option specifying claim containing username
      'header_name' => 'Authorization', // default null, option for usage normal oauth2 header
      'token_prefix' => 'Bearer',
  ]
];

// $app['apiUsers'] = function () use ($app) {
$app['users'] = function () use ($app) { // TODO : why need to be called 'users' to enable jwt ?
        //   $users = [
    //       'admin' => array(
    //           'roles' => array('ROLE_ADMIN'),
    //           // raw password is foo
    //           'password' => '5FZ2Z8QIkA7UTZ4BYkoC+GsReLf569mSKDsfods6LYQ8t+a8EW9oaircfMpmaLbPBh4FOBiiFyLfuZmTSUwzZg==',
    //           'enabled' => true
    //       ),
    //   ];
    $users = [];
    $apiUsers = $app['session']->get('apiUsers', []);
    array_walk($apiUsers, function(&$apiUser, &$key) use (&$users) {
        // $key = "Change key value..." ?;
        // $users[] = new User($key, null);
        $users[$key] = [
            // => one role + one password mandatory :
            // https://silex.symfony.com/doc/2.0/providers/security.html
            // 'ROLE_USER', null => not working with jwt...
            'roles' => ['ROLE_USER'],
            'enabled' => true,
            'username' => $key,
        ];
    });
    $app['log.review']->debug("Loading Users : ", $users);

    return new InMemoryUserProvider(
        $users
    );
};
$firewalls = [
    'login' => [
        'pattern' => 'login|register|oauth',
        'anonymous' => true,
        // 'methods' => ['GET', 'POST', 'OPTIONS'],
    ],
];
if ($app['debug'] && !$prodDebug) {
    $firewalls[] = [
        // 'debug-profiler' => [
        //     'pattern' => new RequestMatcher('^/_profiler.*$'),
        //     // 'pattern' => new RequestMatcher('^/api', "TODO : host string fetch there"),
        //     'http' => true,
        //     'anonymous' => true,
        //     // 'methods' => ['GET', 'POST', 'OPTIONS'],
        // ],    
        // 'cors-handshake-2' => [
        //     'pattern' => '^.*$',
        //     'anonymous' => true,
        //     'methods' => ['OPTIONS'],
        // ],
    ];
}
$firewalls = array_merge($firewalls, [
    'cors-handshake' => [
        'pattern' => '^.*$',
        'anonymous' => true,
        'methods' => ['OPTIONS'],
    ],
    'api-moon-box' => [
        'pattern' => '^/api/moon-box/.*$',
        'methods' => ['GET', 'POST'],
        // 'anonymous' => true,
        'logout' => array('logout_path' => '/api/moon-box/logout'),
        'users' => $app['users'], // useless since check app.users inside lib ?
        'jwt' => array(
            'use_forward' => true,
            'require_previous_session' => true,
            'stateless' => true,
        )
    ],
    'secured' => array(
        'pattern' => '^.*$',
        'methods' => ['GET', 'POST'],
        'logout' => array('logout_path' => '/logout'),
        'users' => $app['users'], // useless since check app.users inside lib ?
        'jwt' => array(
            'use_forward' => true,
            'require_previous_session' => true,
            'stateless' => true,
        )
    ),
]);

// $app['security.firewalls'] = $firewalls;
$app['security.firewalls'] = array(
    'login' => [
        'pattern' => 'login|register|oauth',
        'anonymous' => true,
        // 'methods' => ['GET', 'POST', 'OPTIONS'],
    ],
    'cors-handshake' => [
        'pattern' => '^.*$',
        'anonymous' => true,
        'methods' => ['OPTIONS'],
    ],
    'api-moon-box' => [
        'pattern' => '^/api/moon-box/.*$',
        'methods' => ['GET', 'POST'],
        // 'anonymous' => true,
        'logout' => array('logout_path' => '/api/moon-box/logout'),
        'users' => $app['users'], // useless since check app.users inside lib ?
        'jwt' => array(
            'use_forward' => true,
            'require_previous_session' => true,
            'stateless' => true,
        )
    ],
    'secured' => array(
        'pattern' => '^.*$',
        'methods' => ['GET', 'POST'],
        'logout' => array('logout_path' => '/logout'),
        'users' => $app['users'], // useless since check app.users inside lib ?
        'jwt' => array(
            'use_forward' => true,
            'require_previous_session' => true,
            'stateless' => true,
        )
    ),
);


$ctlrs = $app['controllers'];

$app->before(function($request, $app) {
    // $app['log.review']->debug("BEFORE");
    // return new Response('d', 200);        
    if ('OPTIONS' === $request->getMethod()) {
        $r = new Response('', 200);
        AddingCors::addCors($request, $r);
        $app['log.review']->debug("Allowing options");
        return $r;        
    }
});

// $app->register(new Silex\Provider\SecurityServiceProvider(), [
//     // https://github.com/silexphp/Silex/issues/1044
//     'security.firewalls' => $app['security.firewalls'],
// ]);
$app->register(new Silex\Provider\SecurityServiceProvider());
$app->register(new Silex\Provider\SecurityJWTServiceProvider());
$app->register(new Silex\Provider\LocaleServiceProvider());
$app->register(new Silex\Provider\TranslationServiceProvider());
$app->register(new Monwoo\Provider\ImapDataProvider());

if ($app['debug']) {
    $app['profiler.cache_dir'] = $app['cache_dir'] . '/profiler';
    $app->register(new Silex\Provider\VarDumperServiceProvider());
    $app->register(new Silex\Provider\ServiceControllerServiceProvider());
    if (!$prodDebug) {
        // $prodDebug means it's runing without vendors folder ref
        // Due to current integration of .phar building process...
        // Avoiding possible un-solved issue by avoiding twig for now...
        // Ps : laravel system based on .blade teplates ?
        $app->register(new Silex\Provider\HttpFragmentServiceProvider());
        $app->register(new Silex\Provider\TwigServiceProvider());
        $app->register(new Silex\Provider\WebProfilerServiceProvider());
    }
}


// $app->post('/api/login', function(Request $request) use ($app){
$ctlrs->match('/api/login', function(Request $request) use ($app){

  $vars = json_decode($request->getContent(), true);
  // var_dump($vars);exit;
  try {
      if (empty($vars['apiUsername'])) { // || empty($vars['apiUsername'])) {
          throw new UsernameNotFoundException(sprintf('Api Username "%s" does not exist.', $vars['apiUsername']));
      }
      // $token = $app['security.token_storage']->getToken();
      $apiUsername = $vars['apiUsername']; // $token->getUsername()
      $userName = $vars['_username'];

      $apiUsers = $app['session']->get('apiUsers', []);
      if (!array_key_exists($apiUsername, $apiUsers)) {
        $apiUsers[$apiUsername] = [
            // 'roles' => [], // array('ROLE_ADMIN'),
            // raw password is foo
            // 'password' => '5FZ2Z8QIkA7UTZ4BYkoC+GsReLf569mSKDsfods6LYQ8t+a8EW9oaircfMpmaLbPBh4FOBiiFyLfuZmTSUwzZg==',
            'apiUsername' => $apiUsername,
            // 'password' => 'NoPasswordForOpenApi',
            // 'enabled' => true,
            'dataUsers' => [],
        ];
        // Username, password, roles, enabled
        // $apiUsers[$apiUsername] = new User($apiUsername, null, [], true);
        // $apiUsers[$apiUsername]->users = [];
      }
      $apiUser = &$apiUsers[$apiUsername];
      $users = &$apiUser['dataUsers'];
      $users[$userName] = [
        'username' => $vars['_username'],
        'password' => $vars['_password'],
        'params' => $vars['params'],
        'periode' => $vars['periode'],
        'connector' => $vars['selectedProvider'] ?? 'Unknow',
      ];
      // transforming moonBoxEmailsGrouping
      $users[$userName]['params']['moonBoxEmailsGrouping'] = array_reduce(
        $users[$userName]['params']['moonBoxEmailsGrouping']['mbegKeyTransformer'],
          function ($acc, $tuple) {
            // if (isset($acc[$tuple['key']])) {
            //     $acc[$tuple['key']][] = $tuple['value'];
            // } else {
            //     $acc[$tuple['key']] = [$tuple['value']];
            // }
            $acc[$tuple['key']] = $tuple['value'];
            return $acc;
        }, []
      );

      $app['session']->set('apiUsers', $apiUsers);
      $app['log.review']->debug($apiUsername . " Having Api Users : ", $app->obfuskData($apiUsers));

      $response = [
        'success' => true,
        'token' => $app['security.jwt.encoder']->encode(['username' => $apiUsername]),
      ]; // Allowing all, backend is only a proxy server for IMAP and other Server side API features
    } catch (UsernameNotFoundException $e) {
      $response = [
          'success' => false,
          'error' => 'Invalid credentials',
      ];
  }

  return $app->json($response, ($response['success'] == true ? Response::HTTP_OK : Response::HTTP_BAD_REQUEST));
})->bind('api.login')->method('OPTIONS|POST');

$ctlrs->match('/api/messages', function() use ($app){
  $app['log.review']->debug("Listing Messages");
  $jwt = 'no';
  $token = $app['security.token_storage']->getToken();
  if ($token instanceof Silex\Component\Security\Http\Token\JWTToken) {
      $jwt = 'yes';
  }
  $granted = 'no';
  if($app['security.authorization_checker']->isGranted('ROLE_ADMIN')) {
      $granted = 'yes';
  }
  $granted_user = 'no';
  if($app['security.authorization_checker']->isGranted('ROLE_USER')) {
      $granted_user = 'yes';
  }
  $granted_super = 'no';
  if($app['security.authorization_checker']->isGranted('ROLE_SUPER_ADMIN')) {
      $granted_super = 'yes';
  }
  $user = $token->getUser();
  $localApiUsers = $app['session']->get('apiUsers', []);
  $localUsers = $localApiUsers[$token->getUsername()];

  return $app->json([
      'hello' => $token->getUsername(),
      'users' => $localUsers,
      'auth' => $jwt,
      'granted' => $granted,
      'granted_user' => $granted_user,
      'granted_super' => $granted_super,
  ]);
})->bind('api.messages')->method('OPTIONS|GET');;

$app->after(function($request, Response $response) use ($app) {
    $app['log.review']->debug("Adding Cors");
    AddingCors::addCors($request, $response);
});

if (isset($shouldOnlySetup)) {
    $app['log.review']->debug("App setup OK");
} else {
    $app->run();
}
