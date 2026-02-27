import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, TravelMode } from '@googlemaps/google-maps-services-js';

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);
  private readonly apiKey: string;
  private readonly client: Client;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') || '';
    this.client = new Client({});
    if (!this.apiKey) {
      this.logger.warn('Google Maps API key not configured');
    }
  }

  /**
   * Geocode an address to latitude and longitude
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number; address: string } | null> {
    try {
      const response = await this.client.geocode({
        params: {
          address,
          key: this.apiKey,
        },
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
          address: response.data.results[0].formatted_address,
        };
      }

      this.logger.warn(`Geocoding failed for address: ${address}, status: ${response.data.status}`);
      return null;
    } catch (error) {
      this.logger.error('Geocoding error', error);
      return null;
    }
  }

  /**
   * Reverse geocode latitude and longitude to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
    if (!this.apiKey) {
      return undefined;
    }

    try {
      const response = await this.client.reverseGeocode({
        params: {
          latlng: { lat, lng },
          key: this.apiKey,
        },
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        return response.data.results[0].formatted_address;
      }

      this.logger.warn(`Reverse geocoding failed for ${lat},${lng}, status: ${response.data.status}`);
      return undefined;
    } catch (error) {
      this.logger.error('Reverse geocoding error', error);
      return undefined;
    }
  }

  /**
   * Get directions between two points
   */
  async getDirections(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, mode: TravelMode = TravelMode.walking) {
    try {
      const response = await this.client.directions({
        params: {
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          mode,
          key: this.apiKey,
        },
      });

      if (response.data.status === 'OK' && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        return {
          distance: route.legs[0].distance.value, // meters
          duration: route.legs[0].duration.value, // seconds
          polyline: route.overview_polyline.points,
          steps: route.legs[0].steps.map(step => ({
            distance: step.distance.value,
            duration: step.duration.value,
            startLocation: step.start_location,
            endLocation: step.end_location,
            instructions: step.html_instructions,
          })),
        };
      }

      this.logger.warn(`Directions failed, status: ${response.data.status}`);
      return null;
    } catch (error) {
      this.logger.error('Directions error', error);
      return null;
    }
  }

  /**
   * Calculate distance between two points using Haversine formula (no API call)
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Return in meters
  }

  /**
   * Check if a point is within a certain distance from a path (polyline)
   */
  isPointNearPath(point: { lat: number; lng: number }, polyline: string, threshold: number = 50): boolean {
    // Decode polyline (simplified, in production use a proper decoder)
    // For now, assume polyline is a series of lat,lng points
    // This is a placeholder - proper implementation needed
    return true; // Placeholder
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
