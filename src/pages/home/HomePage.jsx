import { useEffect, useState, useRef } from 'react';
import CategoryGrid from '../../components/product/CategoryGrid';
import ProductSection from '../../components/product/ProductSection';
import { useCategories } from '../../hooks/useCategories';

// Marketing Components
import {
    TrustBadges,
    AppDownloadPromo
} from '../../components/marketing';

/**
 * A wrapper to defer rendering of components until they are close to the viewport.
 * This significantly improves initial page load and rendering performance.
 */
const LazySection = ({ children, threshold = 0.1, rootMargin = '100px' }) => {
    const [isInView, setIsInView] = useState(false);
    const sectionRef = useRef(null);

    useEffect(() => {
        if (!window.IntersectionObserver) {
            setIsInView(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { threshold, rootMargin }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, [threshold, rootMargin]);

    return (
        <div ref={sectionRef} style={{ minHeight: isInView ? 'auto' : '300px' }}>
            {isInView ? children : null}
        </div>
    );
};

const HomePage = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const { categories } = useCategories();

    // Helper to find category ID by name
    const getCategoryIdByName = (name) => {
        const cat = categories.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
        return cat ? cat.id : null;
    };

    return (
        <div className="flex-1 bg-[#eaeded]">
            <CategoryGrid />

            {/* 2. Middle section - Priority 1 product section */}
            <ProductSection
                title="Dairy, Bread & Eggs"
                categoryId={getCategoryIdByName("Dairy")}
            />

            {/* 3. Below the fold - Lazy load everything else */}
            <div className="flex flex-col gap-2">
                <LazySection threshold={0.05} rootMargin="200px">
                    <ProductSection
                        title="Biscuits, Snacks & Namkeens"
                        categoryId={getCategoryIdByName("Snacks")}
                    />
                </LazySection>

                <LazySection threshold={0.05} rootMargin="300px">
                    <ProductSection
                        title="Beverages"
                        categoryId={getCategoryIdByName("Beverages")}
                    />
                </LazySection>
            </div>

            <LazySection rootMargin="400px">
                <AppDownloadPromo />
            </LazySection>

            <LazySection rootMargin="500px">
                <TrustBadges />
            </LazySection>
        </div>
    );
};

export default HomePage;
