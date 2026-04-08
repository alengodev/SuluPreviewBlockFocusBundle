<?php

declare(strict_types=1);

namespace Alengo\SuluPreviewBlockFocusBundle;

use Alengo\SuluPreviewBlockFocusBundle\DependencyInjection\PreviewBlockFocusExtension;
use Symfony\Component\DependencyInjection\Extension\ExtensionInterface;
use Symfony\Component\HttpKernel\Bundle\Bundle;

class PreviewBlockFocusBundle extends Bundle
{
    public function getContainerExtension(): ?ExtensionInterface
    {
        return new PreviewBlockFocusExtension();
    }
}
