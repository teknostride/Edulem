<?php

namespace App\Contracts;

interface SmsServiceInterface
{
    /**
     * Send SMS to one or multiple phone numbers.
     *
     * @param  string|array  $phones
     * @param  string  $message
     * @return array
     */
    public function send(string|array $phones, string $message, ?string $title = null): array;
}
