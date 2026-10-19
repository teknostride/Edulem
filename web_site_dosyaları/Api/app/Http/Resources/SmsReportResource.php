<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class SmsReportResource extends ApiResource
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
            'phone' => $this->phone,
            'status' => $this->status,
            'sent_at' => $this->sent_at?->format('Y-m-d H:i:s'),
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
        $fields['message'] = $this->message;
        $fields['delivered_at'] = $this->delivered_at?->format('Y-m-d H:i:s');
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
        
        if ($this->relationLoaded('creator') && $this->creator) {
            $fields['creator'] = [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ];
        }
        
        $fields['message'] = $this->message;
        $fields['message_id'] = $this->message_id;
        $fields['error_code'] = $this->error_code;
        $fields['error_message'] = $this->error_message;
        $fields['delivered_at'] = $this->delivered_at?->format('Y-m-d H:i:s');
        $fields['sender_type'] = $this->sender_type;
        $fields['sender_id'] = $this->sender_id;
        $fields['updated_at'] = $this->updated_at->format('Y-m-d H:i:s');
        
        return $fields;
    }
}
