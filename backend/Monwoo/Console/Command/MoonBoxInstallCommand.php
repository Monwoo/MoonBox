<?php
// Copyright Monwoo 2017-2018, by Miguel Monwoo, service@monwoo.com
// Inspired from 
// MonwooMarket/silexDemo/src/Core/Command/MoonBoxInstallCommand.php
namespace Monwoo\Console\Command;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\BufferedOutput;
use Symfony\Component\Console\Question\ConfirmationQuestion;
use Symfony\Component\Console\Question\Question;
use Symfony\Component\Console\Helper\TableHelper;
use Symfony\Component\Console\Helper\Table;
use Symfony\Component\Console\Helper\ProgressBar;
use Symfony\Component\Console\Output\StreamOutput;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Process\ProcessBuilder;
use Symfony\Component\Yaml\Yaml;
use Symfony\Component\DependencyInjection\Container as ContainerInterface;
use Pimple\Container;
use Phar;

use Monwoo\Console\Traits\RunnableCommandTrait;

use AWurth\Silex\User\Command\ContainerAwareCommand;
// /**
//  * Wrapper for GenerateDoctrineEntityCommand. TODO : adapt code
//  *
//  * @author Miguel Monwoo <service@monwoo.com>
//  */
// class ContainerAwareCommand extends ContainerInterface
// {
//     public function __construct(Container $container)
//     {
//         parent::__construct();
//         // Try force set container to Pimple container
//         $this->container = $container;
//     }
// }

/**
 * # Dev install : by copy of current env
 * php bin/console -vvv moon-box:install -c . -e 'prod.sqlite'
 * # Building all from internet :
 * php bin/console moon-box:install -e 'prod.sqlite'
 * # You need to config phar.readonly in you php.ini
 * # or use call like :
 * php -d phar.readonly=0 bin/console -vvv moon-box:install -c . -e 'prod.sqlite'
 * php -d phar.readonly=0 bin/console moon-box:install -e 'prod.sqlite'
 *
 * @author Miguel Monwoo <service@monwoo.com>
 */
class MoonBoxInstallCommand extends ContainerAwareCommand
{
    use RunnableCommandTrait;
    protected $default_timeout = 30 * 60;
    /**
     * {@inheritdoc}
     */
    protected function configure()
    {
        $this
        // https://symfony.com/doc/current/console/input.html
        ->setName('moon-box:install')
        ->setDescription('Installer for MoonBox by Monwoo')
        // ->setDefinition([
        //     new InputOption('restore', 'r', InputOption::VALUE_OPTIONAL
        //     , 'Restore last backup', false)
        // ])
        ->addOption('build-folder', 'b', InputOption::VALUE_REQUIRED
        , 'Specify destination folder to put installation generated files' . PHP_EOL
        , 'build')
        ->addOption('zip-password', 'p', InputOption::VALUE_OPTIONAL
        , 'Specify zip password to use to generate or load archive' . PHP_EOL, false)
        ->addOption('config-moon-box-name', ''/*'c-sn'*/, InputOption::VALUE_OPTIONAL
        , 'Name id of the generated MoonBox, match /[a-z0-9]+/i' . PHP_EOL, 'monwoo-moon-box')
        // ->addOption('config-frontend-base-url', ''/*'c-ma'*/, InputOption::VALUE_OPTIONAL
        // , "Base Url for frontend production destination" . PHP_EOL, null)
        // ->addOption('config-backend-base-url', ''/*'c-mb'*/, InputOption::VALUE_OPTIONAL
        // , "Base Url for backend production destination" . PHP_EOL, null)
        ->addOption('config-php-bin', ''/*'c-pb'*/
        , InputOption::VALUE_OPTIONAL
        , 'Path to your php 7 binary' . PHP_EOL, 'php')
        ->addOption('config-yarn-bin', ''/*'c-y'*/, InputOption::VALUE_OPTIONAL
        , 'Path to your yarn binary' . PHP_EOL, 'yarn')
        ->addOption('config-bower-bin', ''/*'c-b'*/, InputOption::VALUE_OPTIONAL
        , 'Path to your bower binary' . PHP_EOL, 'bower')
        ->addOption('config-gulp-bin', ''/*'c-g'*/, InputOption::VALUE_OPTIONAL
        , 'Path to your gulp binary' . PHP_EOL, 'gulp')
        ->addOption('dev', 'd', InputOption::VALUE_OPTIONAL
        , 'Install for developpement' . PHP_EOL, false)
        ->addOption('env', 'e', InputOption::VALUE_OPTIONAL
        , 'Specify env extension to force load initial config from.' . PHP_EOL
        . 'Input file will be install-config.<env>.yml' . PHP_EOL, 'prod')
        ->addOption('dependencies-copy-source', 'c', InputOption::VALUE_OPTIONAL
        , 'Copy dependencies from source to install folder '
        . 'instead of fresh installs.'
        . 'Use -c false to use composer and Internet' . PHP_EOL, '')
        ->addOption('offline', ''/*'off'*/, InputOption::VALUE_OPTIONAL
        , 'Try to install in offline mode (from what you have in cache)' . PHP_EOL, false)
        ->setHelp(
            // TODO : why not working like in documentation ?
            // -r do not work, --restore do no work, only -restore works...
            'The <info>moon-box:install</info> command will generate installation files'
            . ' provided by installations scripts.'
        );
    }
    /**
     * {@inheritdoc}
     */
    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $self = $this;
        $app = $self->container;
        $self->initCmdRunner($input, $output);
        set_time_limit(30*60); // 30 minutes wait for install
        // Init
        // $php =
        $prefixWithAppRoot = function ($e) use ($app) {
            if (substr($e, 0, 1) === '/') {
                return $e; // Do not prefix absolute paths
            }
            return $app['root_dir'] . '/' . $e;
        };
        $unprefixWithAppRoot = function ($e) use ($app) {
            return str_replace($app['root_dir'] . '/', '', $e);
        };
        $self->installName = 'MoonBox-' . date('Ymd_His');
        $installFolder = $app['root_dir'];
        /**
        * var_dump("installer folder " .  $installFolder);
        * exit(42);
        */
        $zipPassword = $self->initArchivePassword(
            $input->getOption('zip-password')
        );

        $self->depsCopySrc = $input->getOption('dependencies-copy-source');
        $self->isDev = $input->getOption('dev');
        $self->isDev = $self->isDev === null || $self->isDev;
        $self->isOffline = $input->getOption('offline');
        $self->isOffline = null === $self->isOffline || $self->isOffline;
        $self->config = $config = $self->initConfig(); // TODO : use config file instead of command line options ?
        $fs = new Filesystem();
        $buildFolder = realpath($prefixWithAppRoot($input->getOption('build-folder')));
        $srcFolder = realpath($prefixWithAppRoot(''));
        if (!$buildFolder) { // TODO : is false under windows&unix, why do not get default value ?  
            $buildFolder = $app['root_dir'] . '/build';
        }
        $installFolder = $buildFolder . '/' . $self->installName;
        $installArchivePath = $buildFolder . '/' . $self->installName . ".zip";
        $fs->mkdir($installFolder);
        $output->writeln("<info>Installing to $installFolder</info>");
        // copy production files & folders to $buildFolder
        $keepFiles = [
            'Monwoo',
            '.htaccess',
            'iframe.js',
            'index.php',
            'vendorFixies',
            // 'config.php',
            $self->isDev ? ( // TODO : factorize, 2 place to setup dev status : inside php file + as param... 
                $self->env ==='preprod' ? 'config.preprod.php' : 'config.dev.php') : 'config.prod.php',
        ];

        if ('false' === $self->depsCopySrc) {
            $keepFiles[] = 'composer.json';
            $keepFiles[] = 'composer.phar';
        }
        $progressBar = new ProgressBar($output, count($keepFiles));
        $progressBar->start();
        $progressBar->setRedrawFrequency(2);
        foreach ($keepFiles as $it => $keep) {
            $keepPath = "$srcFolder/$keep";
            $progressBar->advance();
            // TODO : not working : $progressBar->setMessage("Copying $keep in production");
            if (is_dir($keepPath)) {
                $fs->mirror($keepPath, $installFolder . '/' . $keep);
            } else {
                $fs->copy($keepPath, $installFolder . '/' . $keep);
            }
        }
        if ('prod' === $self->env) {
            $output->writeln("<info> Ajusting with Prod config from config.build.php</info>");
            $fs->copy("$srcFolder/config.build.php", "$installFolder/config.php");
        } else {
            $output->writeln("<info> Keeping config from config.php</info>");
            $fs->copy("$srcFolder/config.php", "$installFolder/config.php");
        }

        $progressBar->finish();
        $output->writeln("<info> => Did finish copy</info>");
        // Add missing empty dir for generated files :
        // $fs->mkdir($installFolder . '/backups');
        // $fs->mkdir($installFolder . '/var/cache/app');
        // $output->writeln("<info>Did finish fixing generated folders </info>");
        // Call composer install as prod
        // Initialise production files
        if ('false' === $self->depsCopySrc) {
            $process = $self->runExternalPhpScript([
                "composer.phar",
                "install",
                "--no-dev",
                "-o",
            ], $installFolder);
            if ($process->getExitCode()) return 1; // Error is already displayed, only have to exit
        } else {
            $cpyBase = $prefixWithAppRoot($self->depsCopySrc);
            $cpySrc = "{$cpyBase}vendor";
            $cpyDst = "$installFolder/vendor";
            $output->writeln("<info>Starting copy of vendor files "
            . "$cpySrc => $cpyDst</info>");
            $fs->mirror($cpySrc, $cpyDst);
            // $fs->copy("$cpyBase/composer.lock", "$installFolder/composer.lock");
        }

        // http://php.net/manual/fr/phar.using.intro.php
        // php -d phar.readonly=0 bin/console -vvv moon-box:install -c . -e 'prod.sqlite'
        if (Phar::canWrite()) {
            $output->writeln("<info>Will generate phar Application</info>");
            // unlink($app['root_dir'] . '/moonBox.phar.tar.gz');
            // unlink($app['root_dir'] . '/moonBox.tar.phar');
            $p = new Phar("$installFolder/moonBox.tar.phar", 0, 'moonBox.tar.phar');
            // Compressing will give fatal memory access error...
            // $p = $p->compress(Phar::GZ);
            // On crée une archive Phar basée sur tar, compressée par gzip (.tar.gz)
            // ini_set('memory_limit', '2048M'); // SOLVE exhausted issue
            // Line below give Memory Exhausted issue for 100M vendor file seem to allocat 100M at least...
            // $p = $p->convertToExecutable(Phar::TAR, Phar::GZ);

            $srcDirs = [
                $installFolder . '/vendor',
                $installFolder . '/vendorFixies',
                $installFolder . '/Monwoo',
            ];
            $srcFiles = [
                'index.php',
                'iframe.js',
                'config.php',
                ($self->isDev ?
                ($self->env ==='preprod' ? 'config.preprod.php' : 'config.dev.php')
                : 'config.prod.php'),
            ];
            // On définit le container (Phar stub)
            $stub = '<?php' . PHP_EOL
            . 'Phar::mapPhar();' . PHP_EOL
            // . 'Phar::interceptFileFuncs();' . PHP_EOL
            // . '$basePath = "phar://" . __FILE__ . "/";' . PHP_EOL
            // . 'require_once $basePath . "vendor/autoload.php";' . PHP_EOL
            // . 'require_once $basePath . "index.php";' . PHP_EOL
            . '__HALT_COMPILER(); ?>' . PHP_EOL;
            // $p->setStub('<?php
            // Phar::mapPhar();
            // $basePath = "phar://" . __FILE__ . "/";
            // require $basePath . "vendor/autoload.php";
            // __HALT_COMPILER();');

            $hasStub = $p->setStub($stub);
            // TODO : be carreful with assert, do not put production code in it since may get removed from call in prod...
            // reaison of phar bug under unix : was building in prod, all assert may have been disabled...
            assert($hasStub, "Fail to set stub");
            $resultStub = $p->getStub();
            // Need php (PECL xdiff >= 0.2.0), will present diff to user
            // $stubDiff = xdiff_string_diff($stub, $resultStub) === "";
            $stubHasDiff = strcmp($stub, $resultStub) !== 0;
            if ($stubHasDiff) {
                $output->writeln("<stubInput>{$stub}</stubInput>\n");
                $output->writeln("<stubOutput>{$resultStub}</stubOutput>\n");
            }


            // On crée une archive Phar basée sur tar, compressée par gzip (.tar.gz)
            // ini_set('memory_limit', '2048M'); // SOLVE exhausted issue
            // Line below give Memory Exhausted issue for 100M vendor file seem to allocat 100M at least...
            // $p = $p->convertToExecutable(Phar::TAR, Phar::GZ);
            // crée une transaction - rien n'est écrit dans nouveauphar.phar
            // jusqu'à ce que stopBuffering() ne soit appelé, bien qu'un stockage temporaire soit requis
            $p->startBuffering();
            // ajoute tous les fichiers de /chemin/vers/leprojet dans le phar avec le préfixe "projet"
            // $p->buildFromIterator(new \RecursiveIteratorIterator(new \DirectoryIterator('./vendor')), './');
            foreach ($srcDirs as $path) {
                $p->buildFromIterator(new \RecursiveIteratorIterator(
                    new \RecursiveDirectoryIterator($path)
                ), $installFolder);
            }
            foreach ($srcFiles as $path) {
                $p->addFile("$installFolder/$path", "$path");
            }
            // // ajoute un nouveau fichier en utilisant l'API d'accès par tableau
            // $p['fichier1.txt'] = 'Information';
            // $fp = fopen('grosfichier.dat', 'rb');
            // // copie toutes les données du flux
            // $p['data/grosfichier.dat'] = $fp;
            //
            // if (Phar::canCompress(Phar::GZ)) {
            //     $p['data/grosfichier.dat']->compress(Phar::GZ);
            // }
            //
            // $p['images/wow.jpg'] = file_get_contents('images/wow.jpg');
            // // toute valeur peut être sauvegardée comme métadonnée spécifique au fichier
            // $p['images/wow.jpg']->setMetadata(array('mime-type' => 'image/jpeg'));
            // $p['index.php'] = file_get_contents('index.php');
            // $p->setMetadata(array('bootstrap' => 'index.php'));
            // sauvegarde l'archive phar sur le disque
            $p->stopBuffering();
            $output->writeln("<info>Will clean bundeled php src</info>");
            $fs->remove([
                "$installFolder/Monwoo",
                "$installFolder/vendor",
                "$installFolder/vendorFixies",
                "$installFolder/config.dev.php",
                "$installFolder/config.php",
                "$installFolder/config.preprod.php",
                "$installFolder/config.prod.php",
                "$installFolder/index.php",
                "$installFolder/composer.lock",
                "$installFolder/composer.json",
                "$installFolder/composer.phar",
            ]);
            $output->writeln("<info>Will add index.php for .phar builded app</info>");
            $fs->copy("$srcFolder/index.phar.php", "$installFolder/index.php");

            // $cleanPaths = [
            //     $installFolder . '/vendor',
            // ];
            // $cleanPaths = array_merge($cleanPaths,
            // glob($installFolder . '/src/*.php'));
            // $cleanPaths = [];
            // $finder = new Finder();
            // $finder->files()->in("$installFolder/vendor")
            // ->name('*.php')
            // ->name('*.js')
            // // ->name('*.twig') // Need to keep twig since template engine is src based, not phar based...
            // // ->name('*.html') // TODO : exlude pattern on *.scss|twig|html insted of add patterns
            // ->name('*.jsx');
            // foreach ($finder as $file) {
            //     $cleanPaths[] = $file->getRealPath();
            // }
            // $finder = new Finder();
            // $finder->files()->in("$installFolder/src")
            // ->name('*.php')
            // ->name('*.js')
            // // ->name('*.twig') // Need to keep twig since template engine is src based, not phar based...
            // // ->name('*.html') // TODO : exlude pattern on *.scss|twig|html insted of add patterns
            // ->name('*.jsx');
            // foreach ($finder as $file) {
            //     $cleanPaths[] = $file->getRealPath();
            // }
            // $fs->remove($cleanPaths);
            // TODO : show nb files in dist build
            // + zip file human readable size
            // find .//. ! -name . -print | grep -c //
            // du -sh <zipfile>
        } else {
            if (false) { // TODO : make loading side work...
                $output->writeln("<error>Fail to create Phar archive</error>");
                throw new \Exception("Need php.ini phar creation permission, or use php -d phar.readonly=0 option");
            }
        }
        // Generate archive of the production files ready to install
        $errorByCode = [
            0 => 'No error',
            1 => 'Multi-disk zip archives not supported',
            2 => 'Renaming temporary file failed',
            3 => 'Closing zip archive failed',
            4 => 'Seek error',
            5 => 'Read error',
            6 => 'Write error',
            7 => 'CRC error',
            8 => 'Containing zip archive was closed',
            9 => 'No such file',
            10 => 'File already exists',
            11 => 'Can\'t open file',
            12 => 'Failure to create temporary file',
            13 => 'Zlib error',
            14 => 'Malloc failure',
            15 => 'Entry has been changed',
            16 => 'Compression method not supported',
            17 => 'Premature EOF',
            18 => 'Invalid argument',
            19 => 'Not a zip archive',
            20 => 'Internal error',
            21 => 'Zip archive inconsistent',
            22 => 'Can\'t remove file',
            23 => 'Entry has been deleted',
        ];
        $zip = new \ZipArchive();
        $openZip = $zip->open($installArchivePath
        , \ZipArchive::CREATE); // | \ZipArchive::OVERWRITE);
        if ($openZip === true) {
            $finder = new Finder();
            $finder->files()->ignoreDotFiles(false)
            ->in($installFolder)
            ->exclude('composer.json')
            ->exclude('composer.phar');
            // ->exclude('node_modules');
            // ->exclude('bower_components');
            foreach ($finder as $file) {
                $zip->addFile($file->getRealPath()
                , $file->getRelativePathname());
                // copy("zip://".$path."#".$filename, "/myDestFolder/".$fileinfo['basename']);
            }
            $zip->close();
        } else {
            $output->writeln("<error>Fail to open zip : {$errorByCode[$openZip]}</error>");
            throw new \Exception("Fail to open zip : {$errorByCode[$openZip]}");
        }
        if ($zipPassword) {
            // TODO : need to use lib to set password, like \PhpZip\ZipFile
            $output->writeln("<error>Password for build not dev yet </error>");
            // throw new \Exception('Password for build not dev yet');
            // $output->writeln("<info>Adding Password to $installArchivePath</info>");
            // $encryptMethod = \PhpZip\ZipFile::ENCRYPTION_METHOD_WINZIP_AES_256;
            // $zipFile->setPassword($zipPassword, $encryptMethod);
        } else {
            // TODO : even this way, my unzip tool keep telling me those zip are encrypted, my zip bug or other ?
            // $zipFile->withoutPassword(); // TODO : why needed if never called setPassword before, static side effects of other commands calls ?
        }
        // Copy tools for installation at root of build folder
        // $fs->copy(($self->depsCopySrc ?? '.') . '/tools/installer.php', $buildFolder . '/installer.php');
        // $fs->copy(($self->depsCopySrc ?? '.') . '/tools/.htaccess', $buildFolder . '/.htaccess');
        $output->writeln("<info>Saved to $installArchivePath </info>");

        // Clear last build symlink :
        // https://stackoverflow.com/questions/11717451/php-unlink-symlink
        $lastBuildPath = dirname($installFolder) . '/lastBuild';
        if(file_exists($lastBuildPath)) {
            assert(is_link($lastBuildPath), "Fail to symlink lastBuild path...");
            unlink($lastBuildPath);
            // $target = readlink($linkfile)
            // unlink($target)      
        }
        // rebuild last build symlink :
        symlink($installFolder, $lastBuildPath);
        $output->writeln("<info>Did symlink $lastBuildPath</info>");
    }

    public function initArchivePassword($pass) {
        $self = $this;
        if (null === $pass) { // User did only specify -p option with no value
            $QuestionHelper = $self->getHelper('question');
            $question = new Question("<question>Type your password :</question>", "");
            $question->setHidden(true);
            $question->setHiddenFallback(false);
            $pass = $QuestionHelper->ask($self->input, $self->output, $question);
            $question = new Question("<question>Re-Type your password :</question>", "");
            $question->setHidden(true);
            $question->setHiddenFallback(false);
            $passConfirm = $QuestionHelper->ask($self->input, $self->output, $question);
            // var_dump($pass, $passConfirm);exit;
            // assert($passConfirm === $pass, "Your passwords must matches");
            if ($passConfirm !== $pass) {
                $self->output->writeln("<error>Password missmatchs</error>");
                return 1;
            }
        }
        return $pass;
    }

    public function initConfig() {
        $self = $this;
        $app = $self->container;
        // Load default config base on environnement :
        $env = $self->input->getOption('env') ?? ($self->isDev ? 'dev' : 'prod');
        // $configPath = $app['root_dir'] . "/install-config.$env.yml";
        $self->env = $env;
        // $self->configSrcPath = $configPath;
        // if (file_exists($configPath)) {
        //     $config = Yaml::parse(file_get_contents($configPath));
        //     $self->output->writeln("<info>Did load Config file : $configPath</info>");
        // } else {
        //     $self->output->writeln("<comment>Ignoring Config file not found : $configPath</comment>");
        //     $config = [];
        // }
        // If still null config, ask user
        $QuestionHelper = $this->getHelper('question');
        foreach ($self->input->getOptions() as $name => $value) {
            if (preg_match("/^config-/", $name)) {
                if ($value !== null) {
                    $config[$name] = $value;
                }
                // var_dump($value);
                if (null === $config[$name]) {
                    $question = new Question("<question>Enter value for $name :</question>", "");
                    $config[$name] = $QuestionHelper->ask($self->input, $self->output, $question);
                }
            }
        }
        // var_dump($config); exit;
        $ymlDump = Yaml::dump($config);
        $self->output->writeln("<comment>Did load config :\n$ymlDump\n</comment>");
        return $config;
    }
    public function runExternalPhpScript($commandArgs, $workingDirectory = null
    , $timeout = null) {
        $self = $this;
        $app = $self->container;
        $php = $self->config['config-php-bin'];
        $workingDirectory = $workingDirectory ? $workingDirectory : $app['root_dir'];
        return $self->runExternalCommand(array_merge([
            "$php"
        ], $commandArgs), $workingDirectory, $timeout);
    }
    public function runExternalYarnCmd($commandArgs, $workingDirectory = null
    , $timeout = null) {
        $self = $this;
        $app = $self->container;
        $yarn = $self->config['config-yarn-bin'];
        if ($self->isOffline) {
            $commandArgs[] = '--offline';
        }
        $workingDirectory = $workingDirectory ? $workingDirectory : $app['root_dir'];
        return $self->runExternalCommand(array_merge([
            "$yarn"
        ], $commandArgs), $workingDirectory, $timeout);
    }
    public function runExternalBowerCmd($commandArgs, $workingDirectory = null
    , $timeout = null) {
        $self = $this;
        $app = $self->container;
        $bower = $self->config['config-bower-bin'];
        if ($self->isOffline) {
            $commandArgs[] = '--offline';
        }
        $workingDirectory = $workingDirectory ? $workingDirectory : $app['root_dir'];
        return $self->runExternalCommand(array_merge([
            "$bower"
        ], $commandArgs), $workingDirectory, $timeout);
    }
    public function runExternalGulpCmd($commandArgs, $workingDirectory = null
    , $timeout = null) {
        $self = $this;
        $app = $self->container;
        $gulp = $self->config['config-gulp-bin'];
        $workingDirectory = $workingDirectory ? $workingDirectory : $app['root_dir'];
        return $self->runExternalCommand(array_merge([
            "$gulp"
        ], $commandArgs), $workingDirectory, $timeout);
    }
    public function runExternalCommand($commandArgs, $workingDirectory = null
    , $timeout = null) {
        $self = $this;
        $timeout = $timeout ?? $self->default_timeout;
        $app = $self->container;
        // TODO : use process helper instead ? cf symfony process helper
        // $help = $self->getHelper('process');
        $output = $self->output; // new BufferedOutput();
        // https://github.com/symfony/symfony/issues/18744
        // $output = new StreamOutput($output->getStream()); // Make write to stdout
        //$output = new BufferedOutput();
        $helper = $this->getHelperSet()->get('process');
        // http://api.symfony.com/3.3/Symfony/Component/Process/Process.html
        $process = ProcessBuilder::create($commandArgs)->getProcess();
        // $builder = new ProcessBuilder();
        // $builder->setPrefix('php bin/console');
        // $builder->setArguments('cmds')->getProcess()->getCommandLine();
        $process->enableOutput();
        $process->setTimeout($timeout);
        // var_dump($workingDirectory);
        if ($workingDirectory) {
            $process->setWorkingDirectory($workingDirectory);
            $output->writeln("<info> WorkingDirectory to : "
            . $workingDirectory . "</info>");
        }
        $process = $helper->run($output, $process);
        $process->wait(function($outputType, $outputChunk) {
            //var_dump($outputChunk);
        });
        // var_dump($process->getOutput());
        if ($process->getExitCode()) {
            $output->writeln("<error>"
            . $process->getErrorOutput() . "</error>");
            $output->writeln("<error> FAIL : "
            . $process->getCommandline() . " : "
            . $process->getOutput() . "</error>");
        } else {
            $output->writeln(// $process->getOutput() .
            "<info> Succed : "
            . $process->getCommandline() . " : "
            . "</info>");
        }
        // var_dump($process->getWorkingDirectory());
        $process->clearErrorOutput();
        return $process;
    }
    /**
     * {@inheritdoc}
     */
    // protected function interact(InputInterface $input, OutputInterface $output)
    // {
    //     if (!$input->getArgument('lang')) {
    //         $question = new Question('Please choose a language:');
    //         $question->setValidator(function ($lang) {
    //             if (empty($lang)) {
    //                 throw new \Exception('Language can not be empty');
    //             }
    //
    //             return $lang;
    //         });
    //         $answer = $this->getHelper('question')->ask($input, $output, $question);
    //
    //         $input->setArgument('lang', $lang);
    //     }
    // }
}