import React, { useState, useCallback, useEffect } from 'react';
import { X, MapPin, Home, Briefcase, Building2, User, Phone, MapPinned, Navigation, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';

const AddressModal = ({ isOpen, onClose, onSave, initialData, user }) => {
    const [isDetecting, setIsDetecting] = useState(false);
    const [detectionError, setDetectionError] = useState('');
    const [detectionSuccess, setDetectionSuccess] = useState(false);
    const [markerPosition, setMarkerPosition] = useState({ lat: 17.3850, lng: 78.4867 }); // Default to Hyderabad

    const [addressDetails, setAddressDetails] = useState({
        type: 'Home',
        flatNo: '',
        floor: '',
        area: '',
        landmark: '',
        locality: '',
        city: '',
        state: '',
        pincode: '',
        fullAddress: '',
        contactName: user?.displayName || '',
        contactPhone: user?.phoneNumber || '',
        lat: markerPosition.lat,
        lng: markerPosition.lng
    });

    useEffect(() => {
        if (initialData) {
            setAddressDetails(prev => ({
                ...prev,
                ...initialData
            }));
            if (initialData.lat && initialData.lng) {
                setMarkerPosition({ lat: initialData.lat, lng: initialData.lng });
            }
        }
    }, [initialData]);

    // Detect current location and auto-fill address fields
    const handleDetectLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setDetectionError("Geolocation is not supported by your browser");
            return;
        }

        setIsDetecting(true);
        setDetectionError('');
        setDetectionSuccess(false);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

                try {
                    const response = await fetch(
                        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
                    );
                    const data = await response.json();

                    if (data.status === 'OK' && data.results.length > 0) {
                        const result = data.results[0];
                        const addressComponents = result.address_components;

                        // Extract address components
                        let route = '';
                        let sublocality = '';
                        let locality = '';
                        let city = '';
                        let state = '';
                        let pincode = '';

                        for (const component of addressComponents) {
                            const types = component.types;

                            if (types.includes('route')) {
                                route = component.long_name;
                            }
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

                        // Build area string
                        const areaDetails = [sublocality, locality].filter(Boolean).join(', ');

                        // Update marker position
                        setMarkerPosition({ lat: latitude, lng: longitude });

                        // Auto-fill all address fields
                        setAddressDetails(prev => ({
                            ...prev,
                            area: areaDetails || result.formatted_address.split(',').slice(0, 2).join(', '),
                            locality: sublocality || locality,
                            city: city,
                            state: state,
                            pincode: pincode,
                            fullAddress: result.formatted_address,
                            lat: latitude,
                            lng: longitude,
                            // Auto-fill landmark if we have a route/street
                            landmark: route ? `Near ${route}` : prev.landmark
                        }));

                        setDetectionSuccess(true);
                        setTimeout(() => setDetectionSuccess(false), 3000);
                    } else if (data.status === 'REQUEST_DENIED' || data.status === 'OVER_QUERY_LIMIT') {
                        // Google API issue - try OpenStreetMap Nominatim as fallback
                        console.warn("Google Geocoding API issue:", data.status, "- Trying Nominatim fallback");

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
                                const locality = addr.city_district || addr.county || '';
                                const city = addr.city || addr.town || addr.village || addr.state_district || '';
                                const state = addr.state || '';
                                const pincode = addr.postcode || '';
                                const areaDetails = [sublocality, locality].filter(Boolean).join(', ');

                                setMarkerPosition({ lat: latitude, lng: longitude });
                                setAddressDetails(prev => ({
                                    ...prev,
                                    area: areaDetails || nominatimData.display_name?.split(',').slice(0, 2).join(', ') || '',
                                    locality: sublocality || locality,
                                    city: city,
                                    state: state,
                                    pincode: pincode,
                                    fullAddress: nominatimData.display_name || '',
                                    lat: latitude,
                                    lng: longitude,
                                    landmark: addr.road ? `Near ${addr.road}` : prev.landmark
                                }));

                                setDetectionSuccess(true);
                                setTimeout(() => setDetectionSuccess(false), 3000);
                            } else {
                                throw new Error('Nominatim returned no address');
                            }
                        } catch (nominatimError) {
                            console.warn("Nominatim fallback also failed:", nominatimError);
                            // Both APIs failed - save coordinates only
                            setMarkerPosition({ lat: latitude, lng: longitude });
                            setAddressDetails(prev => ({
                                ...prev,
                                area: 'Current Location (enter area manually)',
                                fullAddress: `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                                lat: latitude,
                                lng: longitude
                            }));
                            setDetectionSuccess(true);
                            setDetectionError('Location detected! Please enter area details manually.');
                            setTimeout(() => setDetectionSuccess(false), 3000);
                        }
                    } else {
                        // Other geocoding error - still save coordinates
                        console.warn("Geocoding returned:", data.status);
                        setMarkerPosition({ lat: latitude, lng: longitude });
                        setAddressDetails(prev => ({
                            ...prev,
                            lat: latitude,
                            lng: longitude
                        }));
                        setDetectionError('Could not get address details. Please enter manually.');
                    }
                } catch (error) {
                    console.error("Error fetching address:", error);
                    // Network error - still save coordinates
                    setMarkerPosition({ lat: latitude, lng: longitude });
                    setAddressDetails(prev => ({
                        ...prev,
                        lat: latitude,
                        lng: longitude
                    }));
                    setDetectionError('Network error. GPS location saved - please enter address manually.');
                }

                setIsDetecting(false);
            },
            (error) => {
                console.error("Error detecting location:", error);
                let errorMsg = 'Unable to detect location.';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = 'Location permission denied. Please enable location access in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMsg = 'Location request timed out. Please try again.';
                        break;
                }

                setDetectionError(errorMsg);
                setIsDetecting(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    }, []);

    const handleSave = (e) => {
        e.preventDefault();
        onSave(addressDetails);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative bg-white w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>

                {/* Header */}
                <div className="p-6 border-b">
                    <h3 className="text-xl font-bold text-gray-900">Enter complete address</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Help us find you faster</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Detect Location Button - Prominent Position */}
                    <div className="space-y-3">
                        <button
                            onClick={handleDetectLocation}
                            disabled={isDetecting}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${isDetecting
                                ? 'bg-gray-50 border-gray-200 cursor-wait'
                                : detectionSuccess
                                    ? 'bg-green-50 border-green-300'
                                    : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-400 hover:shadow-md'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${detectionSuccess ? 'bg-green-500' : 'bg-zipcart-green'
                                }`}>
                                {isDetecting ? (
                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                ) : detectionSuccess ? (
                                    <CheckCircle className="w-6 h-6 text-white" />
                                ) : (
                                    <Navigation className="w-6 h-6 text-white" />
                                )}
                            </div>
                            <div className="text-left flex-1">
                                <p className={`font-bold ${detectionSuccess ? 'text-green-700' : 'text-gray-900'}`}>
                                    {isDetecting ? 'Detecting your location...' : detectionSuccess ? 'Location detected!' : 'Detect Current Location'}
                                </p>
                                <p className={`text-xs ${detectionSuccess ? 'text-green-600' : 'text-gray-500'}`}>
                                    {isDetecting
                                        ? 'Please wait...'
                                        : detectionSuccess
                                            ? 'Address fields auto-filled below'
                                            : 'Auto-fill address using GPS'}
                                </p>
                            </div>
                        </button>

                        {detectionError && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <p>{detectionError}</p>
                            </div>
                        )}

                        {addressDetails.fullAddress && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                <p className="text-xs font-bold text-blue-700 uppercase mb-1">Detected Location</p>
                                <p className="text-sm text-blue-900">{addressDetails.fullAddress}</p>
                            </div>
                        )}
                    </div>

                    {/* Address Type Selector */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Save address as *</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { id: 'Home', icon: Home, label: 'Home' },
                                { id: 'Work', icon: Briefcase, label: 'Work' },
                                { id: 'Hotel', icon: Building2, label: 'Hotel' },
                                { id: 'Other', icon: MapPinned, label: 'Other' }
                            ].map(({ id, icon, label }) => {
                                const Icon = icon;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setAddressDetails({ ...addressDetails, type: id })}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${addressDetails.type === id
                                            ? 'border-zipcart-green bg-green-50 text-zipcart-green'
                                            : 'border-gray-100 hover:border-gray-200 text-gray-500'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="text-[10px] font-bold">{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-4">
                            <div className="group border-b border-gray-200 focus-within:border-zipcart-green transition-all pb-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Flat / House no / Building name *</label>
                                <input
                                    required
                                    type="text"
                                    value={addressDetails.flatNo}
                                    onChange={(e) => setAddressDetails({ ...addressDetails, flatNo: e.target.value })}
                                    className="w-full py-1 bg-transparent border-none outline-none text-sm font-medium text-gray-900"
                                    placeholder="e.g. 402, Sunshine Apartments"
                                />
                            </div>

                            <div className="group border-b border-gray-200 focus-within:border-zipcart-green transition-all pb-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Floor (optional)</label>
                                <input
                                    type="text"
                                    value={addressDetails.floor}
                                    onChange={(e) => setAddressDetails({ ...addressDetails, floor: e.target.value })}
                                    className="w-full py-1 bg-transparent border-none outline-none text-sm font-medium text-gray-900"
                                    placeholder="e.g. 4th Floor"
                                />
                            </div>

                            <div className={`group border-b border-gray-200 focus-within:border-zipcart-green transition-all pb-1 p-2 rounded-lg ${addressDetails.area ? 'bg-green-50/50' : 'bg-gray-50/50'}`}>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Area / Sector / Locality *</label>
                                <textarea
                                    required
                                    value={addressDetails.area}
                                    onChange={(e) => setAddressDetails({ ...addressDetails, area: e.target.value })}
                                    className="w-full py-1 bg-transparent border-none outline-none text-sm font-medium text-gray-900 resize-none h-12"
                                    placeholder="Full area details"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className={`group border-b border-gray-200 focus-within:border-zipcart-green transition-all pb-1 ${addressDetails.city ? 'bg-green-50/30' : ''}`}>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">City</label>
                                    <input
                                        type="text"
                                        value={addressDetails.city}
                                        onChange={(e) => setAddressDetails({ ...addressDetails, city: e.target.value })}
                                        className="w-full py-1 bg-transparent border-none outline-none text-sm font-medium text-gray-900"
                                        placeholder="e.g. Hyderabad"
                                    />
                                </div>

                                <div className={`group border-b border-gray-200 focus-within:border-zipcart-green transition-all pb-1 ${addressDetails.pincode ? 'bg-green-50/30' : ''}`}>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Pincode</label>
                                    <input
                                        type="text"
                                        value={addressDetails.pincode}
                                        onChange={(e) => setAddressDetails({ ...addressDetails, pincode: e.target.value })}
                                        className="w-full py-1 bg-transparent border-none outline-none text-sm font-medium text-gray-900"
                                        placeholder="e.g. 500034"
                                    />
                                </div>
                            </div>

                            <div className="group border-b border-gray-200 focus-within:border-zipcart-green transition-all pb-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Nearby landmark (optional)</label>
                                <input
                                    type="text"
                                    value={addressDetails.landmark}
                                    onChange={(e) => setAddressDetails({ ...addressDetails, landmark: e.target.value })}
                                    className="w-full py-1 bg-transparent border-none outline-none text-sm font-medium text-gray-900"
                                    placeholder="e.g. Opp. HDFC Bank"
                                />
                            </div>
                        </div>

                        <div className="pt-4 space-y-4">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Enter details for seamless delivery</p>

                            <div className="relative">
                                <User className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <div className="ml-7 border-b border-gray-200 focus-within:border-zipcart-green transition-all pb-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Your name *</label>
                                    <input
                                        required
                                        type="text"
                                        value={addressDetails.contactName}
                                        onChange={(e) => setAddressDetails({ ...addressDetails, contactName: e.target.value })}
                                        className="w-full py-1 bg-transparent border-none outline-none text-sm font-medium text-gray-900"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>

                            <div className="relative">
                                <Phone className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <div className="ml-7 border-b border-gray-200 focus-within:border-zipcart-green transition-all pb-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Phone number *</label>
                                    <input
                                        required
                                        type="tel"
                                        value={addressDetails.contactPhone}
                                        onChange={(e) => setAddressDetails({ ...addressDetails, contactPhone: e.target.value })}
                                        className="w-full py-1 bg-transparent border-none outline-none text-sm font-medium text-gray-900"
                                        placeholder="9876543210"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-zipcart-green text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 mt-8"
                        >
                            Save Address
                        </button>
                    </form>
                </div>

                <style jsx="true">{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: #f1f1f1;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #e2e2e2;
                        border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #d1d1d1;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default AddressModal;
