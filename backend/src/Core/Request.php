<?php

namespace App\Core;

class Request
{
    private array $body;
    /** @var array<string,mixed> */
    public array $params = []; // route params set by Router

    public function __construct()
    {
        $raw = file_get_contents('php://input');
        $this->body   = $raw ? (json_decode($raw, true) ?? []) : [];
    }

    public function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    public function path(): string
    {
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        return strtok($uri, '?') ?: '/';
    }

    /** Get a value from the JSON body */
    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    /** Get all body fields */
    public function all(): array
    {
        return $this->body;
    }

    /** Extract Bearer token from Authorization header */
    public function bearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        if (str_starts_with($header, 'Bearer ')) {
            return substr($header, 7);
        }

        return null;
    }

    public function ip(): string
    {
        return $_SERVER['REMOTE_ADDR'] ?? '';
    }

    public function userAgent(): string
    {
        return substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 1000);
    }

    /** Attach route params (called by Router) */
    public function withParams(array $params): static
    {
        $clone = clone $this;
        $clone->params = $params;
        return $clone;
    }
}
