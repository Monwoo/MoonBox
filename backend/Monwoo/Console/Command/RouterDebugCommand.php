<?php
// Copyright Monwoo 2017, by Miguel Monwoo, service@monwoo.com
namespace Monwoo\Console\Command;
use AWurth\Silex\User\Command\ContainerAwareCommand;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Question\Question;
use Symfony\Component\Console\Helper\TableHelper;
use Symfony\Component\Console\Helper\Table;
use Symfony\Component\HttpFoundation\Request;
/**
 * @author Miguel Monwoo <service@monwoo.com>
 */
class RouterDebugCommand extends ContainerAwareCommand
{
    /**
     * {@inheritdoc}
     */
    protected function configure()
    {
        $this
        ->setName('debug:router')
            ->setDescription('Debugging router')
            // ->setDefinition([
            //     new InputArgument('lang', InputArgument::REQUIRED, 'The language target')
            // ])
            //             ->setHelp(<<<'EOT'
            // The <info>router:debug</info> command debug routers
            // EOT
            //             );
            ->setHelp(
                'The <info>router:debug</info> command debug routers'
            );
    }
    /**
     * {@inheritdoc}
     */
    protected function execute(InputInterface $input, OutputInterface $output)
    {
        // $lang = $input->getArgument('lang');
        $app = $this->container;
        $console = $app['console'];
        // Define some formatter output
        $table = new Table($output);
        $table->setHeaders(array('Name', 'Path', 'Methods', 'Requirements'));
        // V2 : $table->setLayout(TableHelper::LAYOUT_DEFAULT); // Different layout exists; this is the default
        $table->setStyle('default');
        // Fetch routes
        // $routes = $app['routes']->getIterator();
        // $routes = $app['routes'];
        // $request = Request::createFromGlobals();
        // $app->handle($request);
        // If you want to list the routes before you have handled a request,
        // you neeed to call $container->flush();
        $app->flush();
        $routes = $app['routes']->all();
        foreach ($routes as $name => $route) {
            $requirements = array();
            foreach ($route->getRequirements() as $key => $requirement) {
                $requirements[] = $key . ' => ' . $requirement;
            }
            $table->addRow(array(
                $name,
                $route->getPath(),
                join('|', $route->getMethods()),
                join(', ', $requirements)
            ));
        }
        $table->render($output);
        // $output->writeln(sprintf('Router debug OK for %s', $lang));
        $output->writeln('Router debug OK.');
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