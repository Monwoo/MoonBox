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
use Symfony\Component\Form\Extension\Core\Type as FormType;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpKernel\HttpKernelInterface;
use Symfony\Component\Process\ProcessBuilder;
use Symfony\Component\Yaml\Yaml;

class DataProvider implements ServiceProviderInterface, BootableProviderInterface, ControllerProviderInterface, EventListenerProviderInterface
{
    // CONST FORM_FIELD_EDIT_PATH = 'editor_path';
    protected function init() {
        $self = $this;
        $self->dataset = [];
        $self->dataset_name = 'Data';
        $self->dataset_id = 'data_data';
    }
    public function actionRouteName() {
        $self = $this;
        return "DataProvider.{$self->dataset_id}";
    }
    /**
    * {@inheritdoc}
    */
    public function register(Container $app) {
        $self = $this;
        $self->app = $app;
        $self->init();
        $app["{$self->dataset_id}"] = function ($app) use ($self) {
            return $self->dataset;
        };
        /*
        https://silex.symfony.com/doc/2.0/middlewares.html
        $app->before(function (Request $request) {
            $app['data'] = $self->dataset;
        }, Application::LATE_EVENT);
        https://pimple.symfony.com/
        Modifying Services after Definition
        In some cases you may want to modify a service definition after it has been defined. You can use the extend() method to define additional code to be run on your service just after it is created:
        $container['session_storage'] = function ($c) {
            return new $c['session_storage_class']($c['cookie_name']);
        };
        $container->extend('session_storage', function ($storage, $c) {
            $storage->...();
            return $storage;
        });
        Or to avoid error, only if you know what you do :
        $data = $app['data'];
        unset($app['data']);
        // update $data, then change for nexts call to app (other instances may
        // have old version of app...), prefer extend way, but do not seem
        // to work any where to... object oriented may be better than callback oriented...
        $app['data'] = $data;
        */
    }
    /**
    * {@inheritdoc}
    */
    public function subscribe(Container $app, EventDispatcherInterface $dispatcher)
    {
        // if (null === $app['silex_user.mailer']) {
        //     throw new LogicException('You must configure a mailer to enable email notifications');
        // }
        //
        // $dispatcher->addSubscriber(new RegisterConfirmationByEmailListener(
        //     $app['silex_user.mailer'], $app['url_generator'],
        //     $app['session'])
        // );
    }
    /**
    * {@inheritdoc}
    */
    public function boot(Application $app)
    {
        $app->mount('/', $this->connect($app));
    }
    protected function handleAction($action, $param) {
        $self = $this;
        $app = $self->app;
        $request = $app['request_stack']->getCurrentRequest();
        $locale = $app['locale'];
        $self->actionResponse = null;
        if ('clear' === $action) {
            $self->actionResponse = $app->json(['TODO' => 'code in progress, clear all data, param for more ?']);
            // $app['twig']->render('MoonShopData/edit.twig',
            // $self->context);
        } else if ('list' === $action) {
            $self->actionResponse = $app->json(['TODO' => 'code in progress, list view of data']);
            // $app['twig']->render('MoonShopData/edit.twig',
            // $self->context);
        } else {
            return false;
        }
        return true;
    }
    /**
    * {@inheritdoc}
    */
    public function connect(Application $app)
    {
        $self = $this;
        $self->app = $app;
        $self->context = [];
        // /** @var ControllerCollection $controllers */
        $controllers = $app['controllers_factory'];
        // TODO register url for backup zip protected download for admin users
        $controllers->match("api/moon-box/{$self->dataset_id}/{action}/{param}",
        function ($action, $param)
        use ($app, $self) {
            if ($self->handleAction($action, $param)) {
                return $self->actionResponse ?? $app->json(
                    ['status' => 'Action did not return response']
                );
            } else {
                return new Response(
                    json_encode([
                        "UnknownAction" => $action,
                    ]), 400, ['Content-Type' => 'application/json']
                );
            }
        })
        ->value('action', 'list')
        ->value('param', null)
        ->method('GET|POST|OPTIONS')
        ->bind($self->actionRouteName());
        return $controllers;
    }
    public function trans($message, $params = []) {
        return $this->app['translator']->trans($message, $params);
    }
    public function flash($type, $message)
    {
        $this->app['session']->getFlashBag()->add($type, $message);
    }
    public function setSession($name, $value) {
        return $this->app['session']->set(
            "monwoo.connector.{$this->dataset_id}.$name", $value
        );
    }
    public function getSession($name) {
        return $this->app['session']->get(
            "monwoo.connector.{$this->dataset_id}.$name"
        );
    }
}