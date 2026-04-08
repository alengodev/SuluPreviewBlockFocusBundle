<?php

declare(strict_types=1);

namespace Alengo\SuluPreviewBlockFocusBundle\Twig;

use Symfony\Component\HttpFoundation\Request;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

class PreviewSecurityExtension extends AbstractExtension
{
    public function getFunctions(): array
    {
        return [
            new TwigFunction('sulu_user_loggedin_and_preview', $this->isSuluUserLoggedInAndPreview(...)),
        ];
    }

    private function isSuluUserLoggedInAndPreview(Request $request): bool
    {
        if (!$request->attributes->get('preview')) {
            return false;
        }
        $referer = \parse_url((string) $request->headers->get('referer', ''));
        $path = $referer['path'] ?? '';

        return '/admin/' === $path;
    }
}
