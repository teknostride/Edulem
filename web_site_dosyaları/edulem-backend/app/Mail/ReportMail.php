<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class ReportMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     *
     * @param  string  $reportType
     * @param  string  $filePath
     * @param  string  $format
     * @param  string  $recipientEmail
     * @param  string  $recipientName
     */
    public function __construct(
        public string $reportType,
        public string $filePath,
        public string $format,
        public string $recipientEmail,
        public string $recipientName = ''
    ) {
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $reportName = $this->getReportName($this->reportType);
        
        return new Envelope(
            subject: "{$reportName} Raporu - " . now()->format('d.m.Y'),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.report',
            with: [
                'reportType' => $this->reportType,
                'reportName' => $this->getReportName($this->reportType),
                'format' => $this->format,
                'recipientName' => $this->recipientName ?: $this->recipientEmail,
                'generatedAt' => now()->format('d.m.Y H:i'),
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        $fileName = basename($this->filePath);
        $fileContent = Storage::disk('local')->get($this->filePath);
        $mimeType = $this->format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        
        return [
            Attachment::fromData(fn () => $fileContent, $fileName)
                ->withMime($mimeType),
        ];
    }

    /**
     * Get report name in Turkish.
     *
     * @param  string  $reportType
     * @return string
     */
    protected function getReportName(string $reportType): string
    {
        return match ($reportType) {
            'students' => 'Öğrenci Listesi',
            'financial' => 'Finansal',
            'attendance' => 'Devamsızlık',
            default => 'Rapor',
        };
    }
}
