<?php

namespace App\Contracts;

interface ReportExportInterface
{
    /**
     * Generate and export report.
     *
     * @param  string  $reportType
     * @param  array  $parameters
     * @param  string  $format  (excel, pdf)
     * @return string  File path or URL
     */
    public function export(string $reportType, array $parameters, string $format = 'excel'): string;

    /**
     * Get report data.
     *
     * @param  string  $reportType
     * @param  array  $parameters
     * @return array
     */
    public function getData(string $reportType, array $parameters): array;
}
