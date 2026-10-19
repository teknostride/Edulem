<?php

namespace App\Console\Commands;

use Illuminate\Foundation\Console\ServeCommand as BaseServeCommand;

use function Illuminate\Support\php_binary;

class ServeCommand extends BaseServeCommand
{
    /**
     * Get the full server command.
     * Always use project root server.php with absolute path to avoid
     * "Failed opening required .../Foundation/Console/../resources/server.php" on Windows.
     *
     * @return array<int, string>
     */
    protected function serverCommand()
    {
        $serverPath = base_path('server.php');

        if (! file_exists($serverPath)) {
            $this->ensureServerPhpExists($serverPath);
        }

        $server = realpath($serverPath) ?: $serverPath;

        return [
            php_binary(),
            '-S',
            $this->host().':'.$this->port(),
            $server,
        ];
    }

    /**
     * Create server.php in project root if missing (e.g. Laravel 11 framework no longer ships it).
     */
    protected function ensureServerPhpExists(string $path): void
    {
        $content = <<<'PHP'
<?php

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

if ($uri !== '/' && file_exists(__DIR__.'/public'.$uri)) {
    return false;
}

require_once __DIR__.'/public/index.php';
PHP;
        file_put_contents($path, $content);
    }
}
