<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BulletinResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student' => $this->whenLoaded('student', fn() => new StudentResource($this->student)),
            'template' => $this->whenLoaded('template', fn() => new BulletinTemplateResource($this->template)),
            'title' => $this->title,
            'content' => $this->content,
            'photo_ids' => $this->photo_ids,
            'teacher_comments' => $this->teacher_comments,
            'achievements' => $this->achievements,
            'bulletin_date' => $this->bulletin_date?->format('Y-m-d'),
            'is_published_to_guardian' => $this->is_published_to_guardian,
            'is_published_to_guardian_check' => $this->isPublishedToGuardian(),
            'is_added_to_portfolio' => $this->is_added_to_portfolio,
            'is_added_to_portfolio_check' => $this->isAddedToPortfolio(),
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
