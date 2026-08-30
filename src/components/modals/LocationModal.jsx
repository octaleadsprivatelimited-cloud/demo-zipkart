import React, { useState } from 'react';
import { X, MapPin, Search, Navigation, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const LocationModal = () => {
    const { isLocationOpen, toggleLocation, setLocation } = useCart();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDetecting, setIsDetecting] = useState(false);
    const [detectedDetails, setDetectedDetails] = useState(null);
    const [error, setError] = useState('');

    if (!isLocationOpen) return null;

    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser. Please select a location manually.");
            return;
        }

        setIsDetecting(true);
        setError('');
        setDetectedDetails(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

                console.log("Location detected:", latitude, longitude);

                try {
                    // Try Google Geocoding API
                    const response = await fetch(
                        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
                    );
                    const data = await response.json();

                    console.log("Geocoding response:", data);

                    if (data.status === 'OK' && data.results && data.results.length > 0) {
                        const addressComponents = data.results[0].address_components;

                        // Extract full location details
                        let sublocality = '';
                        let locality = '';
                        let city = '';
                        let state = '';
                        let pincode = '';

                        for (const component of addressComponents) {
                            const types = component.types;

                            if (types.includes('sublocality_level_1') || types.includes('neighborhood')) {
                                sublocality = component.long_name;
                            }
                            if (types.includes('sublocality_level_2')) {
                                locality = component.long_name;
                            }
                            if (types.includes('locality')) {
                                city = component.long_name;
                            }
                            if (types.includes('administrative_area_level_1')) {
                                state = component.long_name;
                            }
                            if (types.includes('postal_code')) {
                                pincode = component.long_name;
                            }
                        }

                        // Create display strings
                        const shortAddress = sublocality && city
                            ? `${sublocality}, ${city}`
                            : data.results[0].formatted_address.split(',').slice(0, 2).join(',');

                        const fullAddress = data.results[0].formatted_address;

                        // Store detected details for display
                        setDetectedDetails({
                            short: shortAddress,
                            full: fullAddress,
                            area: sublocality || locality,
                            city,
                            state,
                            pincode
                        });

                        // Set the location in context
                        setLocation(shortAddress);

                        // Auto-close after 1.5 seconds to show success
                        setTimeout(() => {
                            toggleLocation();
                        }, 1500);
                    } else if (data.status === 'REQUEST_DENIED') {
                        // Google API issue - try OpenStreetMap Nominatim as fallback
                        console.warn("Google Geocoding API denied. Trying Nominatim fallback...");

                        try {
                            const nominatimResponse = await fetch(
                                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
                                {
                                    headers: {
                                        'Accept-Language': 'en',
                                        'User-Agent': 'ZipcartApp/1.0'
                                    }
                                }
                            );
                            const nominatimData = await nominatimResponse.json();

                            if (nominatimData && nominatimData.address) {
                                const addr = nominatimData.address;
                                const sublocality = addr.suburb || addr.neighbourhood || addr.hamlet || '';
                                const city = addr.city || addr.town || addr.village || addr.state_district || '';
                                const state = addr.state || '';
                                const pincode = addr.postcode || '';

                                const shortAddress = sublocality && city
                                    ? `${sublocality}, ${city}`
                                    : nominatimData.display_name?.split(',').slice(0, 2).join(',') || 'Current Location';

                                setDetectedDetails({
                                    short: shortAddress,
                                    full: nominatimData.display_name || '',
                                    area: sublocality,
                                    city,
                                    state,
                                    pincode
                                });

                                setLocation(shortAddress);

                                setTimeout(() => {
                                    toggleLocation();
                                }, 1500);
                            } else {
                                throw new Error('Nominatim returned no address');
                            }
                        } catch (nominatimError) {
                            console.warn("Nominatim fallback also failed:", nominatimError);
                            setDetectedDetails({
                                short: "Current Location",
                                full: `GPS Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                                area: "Current Location",
                                city: "",
                                state: "",
                                pincode: ""
                            });

                            setLocation("Current Location");
                            setError("Note: Address details unavailable. Using your current GPS location.");

                            setTimeout(() => {
                                toggleLocation();
                            }, 2000);
                        }
                    } else {
                        // Other error - still use the location
                        console.warn("Geocoding failed:", data.status);
                        setLocation("Current Location");

                        setDetectedDetails({
                            short: "Current Location",
                            full: `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                            area: "",
                            city: "",
                            state: "",
                            pincode: ""
                        });

                        setTimeout(() => {
                            toggleLocation();
                        }, 1500);
                    }
                } catch (fetchError) {
                    console.error("Error fetching address:", fetchError);

                    // Network error - still save the GPS location
                    setLocation("Current Location");
                    setDetectedDetails({
                        short: "Current Location",
                        full: `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                        area: "",
                        city: "",
                        state: "",
                        pincode: ""
                    });

                    setError("Could not get address details, but your GPS location has been saved.");

                    setTimeout(() => {
                        toggleLocation();
                    }, 2000);
                }

                setIsDetecting(false);
            },
            (geoError) => {
                console.error("Geolocation error:", geoError);
                let errorMsg = '';

                switch (geoError.code) {
                    case geoError.PERMISSION_DENIED:
                        errorMsg = 'Location access denied. Please allow location permission in your browser and try again.';
                        break;
                    case geoError.POSITION_UNAVAILABLE:
                        errorMsg = 'Location information is unavailable. Please check your GPS settings or select manually.';
                        break;
                    case geoError.TIMEOUT:
                        errorMsg = 'Location request timed out. Please try again or select manually.';
                        break;
                    default:
                        errorMsg = 'Could not detect your location. Please try again or select manually.';
                }

                setError(errorMsg);
                setIsDetecting(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    };

    const handleSelectLocation = (loc) => {
        setLocation(loc);
        toggleLocation();
    };

    const savedAddresses = [
        "Banjara Hills, Hyderabad",
        "Jubilee Hills, Hyderabad"
    ];

    const allLocations = [
        "Banjara Hills, Hyderabad",
        "Jubilee Hills, Hyderabad",
        "Gachibowli, Hyderabad",
        "Hitech City, Hyderabad",
        "Madhapur, Hyderabad",
        "Kondapur, Hyderabad",
        "Kukatpally, Hyderabad",
        "Miyapur, Hyderabad",
        "Secunderabad, Hyderabad",
        "Begumpet, Hyderabad",
        "Ameerpet, Hyderabad",
        "Dilsukhnagar, Hyderabad",
        "LB Nagar, Hyderabad",
        "Uppal, Hyderabad",
        "Manikonda, Hyderabad",
        "Financial District, Hyderabad",
        "Shamshabad, Hyderabad",
        "Kompally, Hyderabad"
    ];

    const displayList = searchTerm
        ? allLocations.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
        : savedAddresses;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800">Change Location</h2>
                    <button
                        onClick={toggleLocation}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search for area, street name..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Detect Location Button */}
                    <button
                        onClick={handleDetectLocation}
                        disabled={isDetecting}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all border-2 ${isDetecting
                            ? 'bg-gray-50 border-gray-200 cursor-wait'
                            : detectedDetails
                                ? 'bg-green-50 border-green-300 text-green-700'
                                : 'text-green-700 bg-green-50 hover:bg-green-100 border-green-200 hover:border-green-400'
                            }`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${detectedDetails ? 'bg-green-500' : 'bg-green-600'
                            }`}>
                            {isDetecting ? (
                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                            ) : detectedDetails ? (
                                <CheckCircle className="w-5 h-5 text-white" />
                            ) : (
                                <Navigation className="w-5 h-5 text-white" />
                            )}
                        </div>
                        <div className="text-left flex-1">
                            <p className="font-bold text-sm">
                                {isDetecting ? 'Detecting...' : detectedDetails ? 'Location Detected!' : 'Detect my location'}
                            </p>
                            <p className="text-xs opacity-80">
                                {isDetecting
                                    ? 'Please wait, accessing GPS...'
                                    : detectedDetails
                                        ? detectedDetails.short
                                        : 'Using GPS for accurate location'}
                            </p>
                        </div>
                    </button>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Detected Location Details */}
                    {detectedDetails && !error && (
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl space-y-2">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-green-600" />
                                <p className="text-sm font-bold text-green-800">Your Location</p>
                            </div>
                            <p className="text-sm text-gray-700">{detectedDetails.full}</p>
                            {(detectedDetails.city || detectedDetails.pincode || detectedDetails.state) && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {detectedDetails.city && (
                                        <span className="px-2 py-1 bg-white rounded-full text-xs font-medium text-gray-600">
                                            📍 {detectedDetails.city}
                                        </span>
                                    )}
                                    {detectedDetails.pincode && (
                                        <span className="px-2 py-1 bg-white rounded-full text-xs font-medium text-gray-600">
                                            📮 {detectedDetails.pincode}
                                        </span>
                                    )}
                                    {detectedDetails.state && (
                                        <span className="px-2 py-1 bg-white rounded-full text-xs font-medium text-gray-600">
                                            🏛️ {detectedDetails.state}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Saved Addresses / Suggestions */}
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            {searchTerm ? 'Suggestions' : 'Saved Addresses'}
                        </p>
                        <div className="space-y-0 max-h-48 overflow-y-auto">
                            {displayList.map((loc, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSelectLocation(loc)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors border-b border-gray-50 last:border-0"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                        <MapPin className="w-4 h-4 text-gray-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium text-gray-800 text-sm">{loc.split(',')[0]}</p>
                                        <p className="text-xs text-gray-500 truncate">{loc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationModal;
