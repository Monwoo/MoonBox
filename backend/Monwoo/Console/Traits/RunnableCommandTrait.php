<?php
// Copyright Monwoo 2017, by Miguel Monwoo, service@monwoo.com
namespace Monwoo\Console\Traits;
use Symfony\Component\Console\Input\ArrayInput;
trait RunnableCommandTrait {
    public function initCmdRunner($input, $output) {
        $self = $this;
        $self->input = $input;
        $self->output = $output;
    }
    public function hasCmdRunFail() {
        $self = $this;
        return $self->cmdExitCode !== 0;
    }
    public function runCommand($commandArgs, $output = null) {
        $self = $this;
        $command = $self->getApplication()->find($commandArgs['command']);
        $cmdLine = '';//implode(' ', $commandArgs);
        foreach ($commandArgs as $cmd => $value) {
            $cmdLine .= "[$cmd $value] ";
        }
        $Input = new ArrayInput($commandArgs);
        $self->cmdExitCode = $command->run($Input
        , $output ? $output : $self->output);
        if ($self->cmdExitCode) {
            $self->output->writeln("<error>FAIL : $cmdLine</error>");
        } else {
            $self->output->writeln("<info>Succed : $cmdLine</info>");
        }
        return $self->cmdExitCode;
    }
}