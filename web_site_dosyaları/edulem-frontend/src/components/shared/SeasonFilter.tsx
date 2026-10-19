import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';

interface Season {
    id: number;
    name: string;
    is_active: boolean;
}

interface SeasonFilterProps {
    value: string | number;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const SeasonFilter = ({ value, onChange, placeholder = 'Tüm Sezonlar', className = 'form-select' }: SeasonFilterProps) => {
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchSeasons = async () => {
            try {
                setLoading(true);
                const response = await axiosClient.get('/seasons');
                setSeasons(response.data?.data || []);
            } catch (error) {
                console.error('Sezonlar yüklenemedi:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSeasons();
    }, []);

    return (
        <select 
            className={className} 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            disabled={loading}
        >
            <option value="">{placeholder}</option>
            {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                    {season.name} {season.is_active ? '(Aktif)' : ''}
                </option>
            ))}
        </select>
    );
};

export default SeasonFilter;
