<?php
// Copyright Monwoo 2018, by Miguel Monwoo, service@monwoo.com

require_once __DIR__ . '/vendor/autoload.php';

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Exception\UsernameNotFoundException;
use Symfony\Component\Security\Core\User\InMemoryUserProvider;
use Symfony\Component\Security\Core\User\User;
use Monwoo\Middleware\AddingCors;
use Monolog\Logger;
use Symfony\Component\HttpKernel\Log\Logger as ConsoleLogger;

use Symfony\Component\Yaml\Yaml;
use Symfony\Component\Filesystem\Filesystem;
use Monolog\Handler\AbstractProcessingHandler as AbstractMonologHandler;
use Symfony\Component\HttpKernel\Profiler\Profiler;
use Symfony\Bridge\Monolog\Processor\DebugProcessor;
use Psr\Log\LogLevel;

$config = [
    'debug' => true,
    'loggerName' => "MoonBoxLog",
    'logFilePath' => __DIR__  . '/logs.txt',
];

$app = new Silex\Application([
    'debug' => $config['debug'],
    'logger' => new \Monolog\Logger($config['loggerName']),
    'logFilePath' => $config['logFilePath'],
]);
$logLvl = $app['debug'] ? Logger::DEBUG : Logger::ERROR;

$mySaveToFileHandler = new class ($app, $logLvl) extends AbstractMonologHandler {
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
        $logPath = $app['logFilePath'];
        $logs = [];
        $logs[] = $record;
        $fs = new Filesystem();
        $basePath = dirname($logPath);
        if (!is_dir($basePath)) {
            $fs->mkdir($basePath);
        }
        if ($record['level'] >= Logger::WARNING) {
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
$app['logger']->pushHandler($mySaveToFileHandler);
if ($app['debug']) {
    $app['logger']->pushProcessor(new DebugProcessor());
    $app['consoleLogger'] = new ConsoleLogger(LogLevel::DEBUG);
}
$app['logger']->debug("Backend {Action}", ['Action' => "Init"]);

$app['security.jwt'] = [
  'secret_key' => 'Very_secret_key',
  'life_time'  => 86400,
  'options'    => [
      'username_claim' => 'name', // default name, option specifying claim containing username
      'header_name' => 'X-Access-Token', // default null, option for usage normal oauth2 header
      'token_prefix' => 'Bearer',
  ]
];

$app['users'] = function () use ($app) {
  $users = [
      'admin' => array(
          'roles' => array('ROLE_ADMIN'),
          // raw password is foo
          'password' => '5FZ2Z8QIkA7UTZ4BYkoC+GsReLf569mSKDsfods6LYQ8t+a8EW9oaircfMpmaLbPBh4FOBiiFyLfuZmTSUwzZg==',
          'enabled' => true
      ),
  ];

  return new InMemoryUserProvider($users);
};

$app['security.firewalls'] = array(
  'login' => [
      'pattern' => 'login|register|oauth',
      'anonymous' => true,
  ],
  'secured' => array(
      'pattern' => '^.*$',
      'logout' => array('logout_path' => '/logout'),
      'users' => $app['users'],
      'jwt' => array(
          'use_forward' => true,
          'require_previous_session' => false,
          'stateless' => true,
      )
  ),
);

$app->register(new Silex\Provider\SecurityServiceProvider());
$app->register(new Silex\Provider\SecurityJWTServiceProvider());

$ctlrs = $app['controllers'];

$ctlrs->before(function($request, $app) {
    // $app['logger']->debug("BEFORE");
    // return new Response('d', 200);        
    if ('OPTIONS' === $request->getMethod()) {
        $app['logger']->debug("Allowing options");
        return new Response('', 200);        
    }
});

// $app->post('/api/login', function(Request $request) use ($app){
$ctlrs->match('/api/login', function(Request $request) use ($app){

  $vars = json_decode($request->getContent(), true);
  // var_dump($vars);exit;
  try {
      if (empty($vars['_username']) || empty($vars['_password'])) {
          throw new UsernameNotFoundException(sprintf('Username "%s" does not exist.', $vars['_username']));
      }
      $userName = $vars['_username'];

      $response = [
        'success' => true,
        'token' => $app['security.jwt.encoder']->encode(['name' => $userName]),
      ]; // Allowing all, backend is only a proxy server for IMAP and other Server side API features

      /**
       * @var $user User
        $user = $app['users']->loadUserByUsername($vars['_username']);

        if (! $app['security.encoder.digest']->isPasswordValid($user->getPassword(), $vars['_password'], '')) {
            throw new UsernameNotFoundException(sprintf('Username "%s" does not exist.', $vars['_username']));
        } else {
            $response = [
                'success' => true,
                'token' => $app['security.jwt.encoder']->encode(['name' => $user->getUsername()]),
            ];
        }
       */
    } catch (UsernameNotFoundException $e) {
      $response = [
          'success' => false,
          'error' => 'Invalid credentials',
      ];
  }

  return $app->json($response, ($response['success'] == true ? Response::HTTP_OK : Response::HTTP_BAD_REQUEST));
})->bind('api_login')->method('OPTIONS|POST');

$ctlrs->get('/api/messages', function() use ($app){
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
  return $app->json([
      'hello' => $token->getUsername(),
      'username' => $user->getUsername(),
      'auth' => $jwt,
      'granted' => $granted,
      'granted_user' => $granted_user,
      'granted_super' => $granted_super,
  ]);
});

$ctlrs->after(function($request, Response $response) use ($app) {
    $app['logger']->debug("Adding Cors");
    AddingCors::addCors($request, $response);
});

$app->run();