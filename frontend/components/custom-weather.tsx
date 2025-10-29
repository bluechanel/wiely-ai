'use client';

import {usePart} from '@llamaindex/chat-ui';

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
}

const WEATHER_PART_TYPE = 'data-weather';

interface WeatherPart {
  type: typeof WEATHER_PART_TYPE;
  data: WeatherData;
}

/**
 * Custom part component that displays weather information in a chat message.
 */
export function WeatherPart() {
  const weatherData = usePart<WeatherPart>(WEATHER_PART_TYPE)?.data;
  if (!weatherData) return null;
  return <WeatherCard data={weatherData} />;
}

interface WeatherCardProps {
  data: WeatherData;
}

function WeatherCard({data}: WeatherCardProps) {
  const iconMap: Record<string, string> = {
    sunny: '☀️',
    cloudy: '☁️',
    rainy: '🌧️',
    snowy: '❄️',
    stormy: '⛈️',
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <span className="text-2xl">
            {iconMap[data.condition.toLowerCase()] || '🌤️'}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            {data.location}
          </h3>
          <div className="flex items-center gap-4 text-sm text-blue-700 dark:text-blue-300">
            <span className="text-2xl font-bold">{data.temperature}°C</span>
            <span>{data.condition}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-blue-600 dark:text-blue-400">
        <div className="flex items-center gap-2">
          <span>💧 Humidity:</span>
          <span className="font-medium">{data.humidity}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span>🌬️ Wind:</span>
          <span className="font-medium">{data.windSpeed} km/h</span>
        </div>
      </div>
    </div>
  );
}
