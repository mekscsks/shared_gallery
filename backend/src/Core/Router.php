<?php

namespace App\Core;

class Router
{
    /** @var array<string, array<array{pattern: string, params: string[], handler: callable}>> */
    private array $routes = [];

    public function get(string $path, callable $handler): void
    {
        $this->add('GET', $path, $handler);
    }

    public function post(string $path, callable $handler): void
    {
        $this->add('POST', $path, $handler);
    }

    public function patch(string $path, callable $handler): void
    {
        $this->add('PATCH', $path, $handler);
    }

    public function put(string $path, callable $handler): void
    {
        $this->add('PUT', $path, $handler);
    }

    public function delete(string $path, callable $handler): void
    {
        $this->add('DELETE', $path, $handler);
    }

    private function add(string $method, string $path, callable $handler): void
    {
        [$pattern, $params] = $this->compile($path);
        $this->routes[$method][] = ['pattern' => $pattern, 'params' => $params, 'handler' => $handler];
    }

    /** Convert /api/events/{id} → regex + param names */
    private function compile(string $path): array
    {
        $params  = [];
        $pattern = preg_replace_callback('/\{(\w+)\}/', function ($m) use (&$params) {
            $params[] = $m[1];
            return '([^/]+)';
        }, $path);

        return ['^' . $pattern . '$', $params];
    }

    public function dispatch(Request $request): void
    {
        $method  = $request->method();
        $path    = $request->path();
        $routes  = $this->routes[$method] ?? [];

        foreach ($routes as $route) {
            if (preg_match('#' . $route['pattern'] . '#', $path, $matches)) {
                array_shift($matches);
                $params  = array_combine($route['params'], $matches) ?: [];
                $request = $request->withParams($params);
                ($route['handler'])($request);
                return;
            }
        }

        Response::error('Not found', 404);
    }
}
