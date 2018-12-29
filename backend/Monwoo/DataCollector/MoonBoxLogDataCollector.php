<?php
// Copyright Monwoo 2017-2018, by Miguel Monwoo, service@monwoo.com
namespace Monwoo\DataCollector;

use Symfony\Component\HttpKernel\DataCollector\LoggerDataCollector;

class MoonBoxLogDataCollector extends LoggerDataCollector
{
    /**
     * {@inheritdoc}
     */
    public function getName()
    {
        return 'moon-box-log';
    }
}
