import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Polyline, Marker } from '@react-google-maps/api';


const libraries = ['places'];

// Custom map styles (optional - clean, modern look)
const mapOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    streetViewControl: false,
    styles: [
        {
            "featureType": "all",
            "elementType": "geometry",
            "stylers": [{ "color": "#f5f5f5" }]
        },
        {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [{ "color": "#ffffff" }]
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{ "color": "#e9e9e9" }]
        },
        {
            "featureType": "water",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#9e9e9e" }]
        }
    ]
};

const DeliveryMap = ({ pickupLocation, deliveryLocation, currentStep }) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries
    });

    const [_map, setMap] = useState(null); // map unused
    const [driverPosition, setDriverPosition] = useState(null);
    const requestRef = useRef();

    // Create a simple straight path between pickup and delivery
    const routePath = React.useMemo(() => {
        // Validate inputs
        if (!pickupLocation || !deliveryLocation) return null;
        if (typeof pickupLocation.lat !== 'number' || typeof pickupLocation.lng !== 'number') return null;
        if (typeof deliveryLocation.lat !== 'number' || typeof deliveryLocation.lng !== 'number') return null;

        // Create interpolated points for smooth animation
        const points = [];
        const steps = 50; // Number of points along the route

        for (let i = 0; i <= steps; i++) {
            const ratio = i / steps;
            points.push({
                lat: pickupLocation.lat + (deliveryLocation.lat - pickupLocation.lat) * ratio,
                lng: pickupLocation.lng + (deliveryLocation.lng - pickupLocation.lng) * ratio
            });
        }

        return points;
    }, [pickupLocation, deliveryLocation]);

    const animateDriver = React.useCallback((path) => {
        let startTime;
        const duration = 10000; // time to traverse in ms for demo
        const startIdx = Math.floor(path.length * 0.1);
        const endIdx = Math.floor(path.length * 0.9);
        const pathSegment = path.slice(startIdx, endIdx);

        const animate = (time) => {
            if (!startTime) startTime = time;
            const progress = (time - startTime) / duration;

            if (progress < 1) {
                const currentIndex = Math.floor(progress * (pathSegment.length - 1));
                if (pathSegment[currentIndex]) {
                    setDriverPosition(pathSegment[currentIndex]);
                }
                requestRef.current = requestAnimationFrame(animate);
            } else {
                setDriverPosition(pathSegment[pathSegment.length - 1]);
            }
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, []);

    // Simulate Driver Movement based on currentStep
    useEffect(() => {
        if (!routePath || routePath.length === 0) {
            // Set initial position to pickup if path not ready
            if (pickupLocation && !driverPosition) {
                setTimeout(() => setDriverPosition(pickupLocation), 0);
            }
            return;
        }

        const totalPoints = routePath.length;
        let targetIndex = 0;

        if (currentStep === 0) targetIndex = 0;
        else if (currentStep === 1) targetIndex = Math.floor(totalPoints * 0.1);
        else if (currentStep === 2) {
            // Animate along the path
            const cleanup = animateDriver(routePath);
            return cleanup;
        }
        else if (currentStep >= 3) targetIndex = totalPoints - 1;

        if (routePath[targetIndex]) {
            // Use setTimeout to avoid synchronous state update warning
            setTimeout(() => setDriverPosition(routePath[targetIndex]), 0);
        }

    }, [currentStep, routePath, animateDriver, pickupLocation, driverPosition]);

    if (loadError) {
        return (
            <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">⚠️</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Map Loading Error</h3>
                    <p className="text-sm text-gray-600 mb-4">Unable to load Google Maps</p>
                    <p className="text-xs text-gray-500">Please check your API key configuration</p>
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-gray-300 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm font-medium text-gray-600">Loading map...</p>
                </div>
            </div>
        );
    }

    return (
        <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%', borderRadius: '1rem' }}
            center={pickupLocation}
            zoom={13}
            onLoad={onLoad => setMap(onLoad)}
            options={mapOptions}
        >
            {/* Store Marker */}
            <Marker
                position={pickupLocation}
                icon={{
                    url: 'https://cdn-icons-png.flaticon.com/512/3514/3514491.png', // Shop Icon
                    scaledSize: new window.google.maps.Size(40, 40)
                }}
            />

            {/* Home Marker */}
            <Marker
                position={deliveryLocation}
                icon={{
                    url: 'https://cdn-icons-png.flaticon.com/512/25/25694.png', // Home Icon
                    scaledSize: new window.google.maps.Size(30, 30)
                }}
            />

            {/* Route Line (Simple Polyline) */}
            {isLoaded && routePath && Array.isArray(routePath) && routePath.length > 1 && (
                <Polyline
                    path={routePath}
                    options={{
                        strokeColor: "#0c831f",
                        strokeWeight: 5,
                        strokeOpacity: 0.8,
                        geodesic: true
                    }}
                />
            )}

            {/* Animated Driver Marker */}
            {driverPosition && currentStep >= 2 && currentStep < 4 && (
                <Marker
                    position={driverPosition}
                    icon={{
                        url: 'https://cdn-icons-png.flaticon.com/512/713/713311.png', // Truck Icon
                        scaledSize: new window.google.maps.Size(50, 50),
                        anchor: new window.google.maps.Point(25, 25)
                    }}
                    zIndex={100}
                />
            )}
        </GoogleMap>
    );
};

export default DeliveryMap;
