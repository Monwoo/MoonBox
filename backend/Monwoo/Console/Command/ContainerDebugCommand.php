<?php
// Copyright Monwoo 2017, by Miguel Monwoo, service@monwoo.com
namespace Monwoo\Console\Command;
use AWurth\Silex\User\Command\ContainerAwareCommand;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Question\Question;
use Symfony\Component\Console\Helper\TableHelper;
use Symfony\Component\Console\Helper\Table;
use Symfony\Component\Console\Helper\TableSeparator;
use Symfony\Component\Console\Helper\TableStyle;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Yaml\Yaml;
// TODO : same for debugging availables twig filters ??
/**
 * @author Miguel Monwoo <service@monwoo.com>
 */
class ContainerDebugCommand extends ContainerAwareCommand
{
    /**
     * {@inheritdoc}
     */
    protected function configure()
    {
        $this
        ->setName('debug:container')
            ->setDescription('Debugging container')
            ->addOption('dump', 'd', InputOption::VALUE_OPTIONAL
            , 'Dump Application container values', false)
            ->setHelp(
                'The <info>container:debug</info> command debug containers'
            );
    }
    /**
     * {@inheritdoc}
     */
    protected function execute(InputInterface $input, OutputInterface $output)
    {
        // $lang = $input->getArgument('lang');
        $self = $this;
        $app = $self->container;
        $console = $app['console'];
        $shouldDump = $input->getOption('dump');
        $shouldDump = $shouldDump === null || $shouldDump;
        // $app['logger']->log('Test from cmd', $self);
        // Define some formatter output
        $self->maxColumnWidth = 42;
        $table = new Table($output);
        if ($shouldDump) {
            $table->setHeaders(['Class & Key', 'Value']);
            // setColumnWidths do not resize oversized strings...
            $table->setColumnWidths([22, $self->maxColumnWidth]);
        } else {
            $table->setHeaders(['Key']);
        }
        // V2 : $table->setLayout(TableHelper::LAYOUT_DEFAULT); // Different layout exists; this is the default
        // by default, this is based on the default style
        $style = new TableStyle();
        // customize the style
        $style
            ->setHorizontalBorderChar('<fg=magenta>-</>')
            ->setVerticalBorderChar('<fg=magenta> </>')
            ->setCrossingChar(' ')
        ;
        // use the style for this table
        $table->setStyle('borderless');
        $table->setStyle($style);
        // $table->setStyle('default');
        // Fetch routes
        // $routes = $app['routes']->getIterator();
        // $routes = $app['routes'];
        // $request = Request::createFromGlobals();
        // $app->handle($request);
        // If you want to list the routes before you have handled a request,
        // you neeed to call $container->flush();
        $app->flush();
        $format = 'yaml';
        foreach ($app->keys() as $it => $name) {
            if ($shouldDump) {
                try {
                    $value = $app[$name];
                } catch (\Throwable $e) {
                    $value = $e->getMessage();
                }
                // $valueByLines = explode("\n", Yaml::dump($value, 4));
                $valueByLines = preg_split("/(\r\n|\n|\r)/"
                , Yaml::dump($value, 4));
                // TODO : , $app['serializer']->serialize($value, $format));
                // var_dump($valueByLines);
                foreach ($valueByLines as $it => $strLineValue) {
                    $sep = "{%#WRAP#%}";
                    $strWrapped = explode($sep, wordwrap($strLineValue
                    , $self->maxColumnWidth, $sep, true));
                    $pad = preg_replace("/^(\s*).*$/", '${1}'
                    , $strLineValue, 1);
                    $pad = $pad ? $pad : '';
                    $pad .= '    ';
                    // var_dump($pad);
                    //$strWrapped = str_split($strLineValue, $self->maxColumnWidth);
                    foreach ($strWrapped as $wIt => $strWrap) {
                        assert(($_len = strlen($strWrap)) <= $self->maxColumnWidth
                        , "Word wrap $_len did fail for : $strWrap");
                        $table->addRow([
                            ($it + $wIt === 0 ? $name : ''),
                            //. ((count($strWrapped) === 1 || $it + $wIt === 1)
                            //&& is_object($value) ? get_class($value) : ''),
                            ($wIt ? $pad : '') . $strWrap,
                        ]);
                    }
                }
                if (is_object($value)) {
                    $table->addRow([
                        "  [".get_class($value)."]",
                        '',
                    ]);
                }
                // $table->addRow([
                //     $name,
                //     Yaml::dump($value, 4),
                // ]);
                // $table->addRow([
                //     '<fg=magenta>---------------------------</>',
                //     '',
                // ]);
                $table->addRow(new TableSeparator());
            } else {
                $table->addRow(array(
                    $name,
                ));
            }
        }
        $table->render($output);
        // $output->writeln(sprintf('Container debug OK for %s', $lang));
        $output->writeln('Container debug OK.');
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