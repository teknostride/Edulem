<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class InternalMessageResource extends ApiResource
{
    /**
     * Get public fields (visible to all authenticated users).
     *
     * @return array<string, mixed>
     */
    protected function getPublicFields(): array
    {
        return [
            'id' => $this->id,
            'subject' => $this->subject,
            'type' => $this->type,
            'priority' => $this->priority,
            'is_read' => $this->is_read,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * Get teacher-specific fields.
     *
     * @return array<string, mixed>
     */
    protected function getTeacherFields(): array
    {
        $fields = $this->getPublicFields();
        
        if ($this->relationLoaded('sender') && $this->sender) {
            $fields['sender'] = [
                'id' => $this->sender->id,
                'name' => $this->sender->name,
            ];
        }
        
        $fields['message'] = $this->message;
        $fields['recipient_type'] = $this->recipient_type;
        
        return $fields;
    }

    /**
     * Get accountant-specific fields.
     *
     * @return array<string, mixed>
     */
    protected function getAccountantFields(): array
    {
        return $this->getPublicFields();
    }

    /**
     * Get all fields (for admin).
     *
     * @return array<string, mixed>
     */
    protected function getAllFields(): array
    {
        $fields = $this->getPublicFields();
        
        if ($this->relationLoaded('sender') && $this->sender) {
            $fields['sender'] = [
                'id' => $this->sender->id,
                'name' => $this->sender->name,
                'email' => $this->sender->email,
            ];
        }
        
        $fields['message'] = $this->message;
        $fields['recipient_ids'] = $this->recipient_ids;
        $fields['recipient_type'] = $this->recipient_type;
        
        if ($this->relationLoaded('recipients')) {
            $fields['recipients'] = $this->recipients->map(function ($recipient) {
                return [
                    'id' => $recipient->recipient_id,
                    'name' => $recipient->recipient->name ?? null,
                    'is_read' => $recipient->is_read,
                    'read_at' => $recipient->read_at?->format('Y-m-d H:i:s'),
                ];
            });
        }
        
        if ($this->relationLoaded('file') && $this->file) {
            $fields['file'] = [
                'id' => $this->file->id,
                'name' => $this->file->original_name,
                'path' => $this->file->path,
            ];
        }
        
        $fields['send_sms'] = $this->send_sms;
        $fields['send_email'] = $this->send_email;
        $fields['sent_at'] = $this->sent_at?->format('Y-m-d H:i:s');
        $fields['updated_at'] = $this->updated_at->format('Y-m-d H:i:s');
        
        return $fields;
    }
}
