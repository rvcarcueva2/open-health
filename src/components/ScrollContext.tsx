import { createContext, useContext, useMemo, useRef } from 'react';
import { Animated } from 'react-native';

interface ScrollContextValue {
  scrollY: Animated.Value;
  lastScrollY: React.MutableRefObject<number>;
  isTabBarVisible: Animated.Value;
}

const ScrollContext = createContext<ScrollContextValue | null>(null);

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  const scrollY = useMemo(() => new Animated.Value(0), []);
  const lastScrollY = useRef(0);
  const isTabBarVisible = useMemo(() => new Animated.Value(1), []);

  const value = useMemo(
    () => ({ scrollY, lastScrollY, isTabBarVisible }),
    [scrollY, lastScrollY, isTabBarVisible]
  );

  return (
    <ScrollContext.Provider value={value}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScrollContext() {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error('useScrollContext must be used within ScrollProvider');
  }
  return context;
}

/**
 * Returns an onScroll handler that drives tab bar visibility.
 * Scroll down → hide tab bar, scroll up → show tab bar.
 */
export function useTabBarScroll() {
  const { lastScrollY, isTabBarVisible } = useScrollContext();

  const onScroll = useMemo(() => {
    let hiding = false;

    return (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const currentY = event.nativeEvent.contentOffset.y;
      const diff = currentY - lastScrollY.current;

      // Only act on meaningful scroll (threshold of 8px)
      if (Math.abs(diff) < 8) return;

      if (diff > 0 && currentY > 50 && !hiding) {
        // Scrolling down → hide
        hiding = true;
        Animated.spring(isTabBarVisible, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }).start();
      } else if (diff < 0 && hiding) {
        // Scrolling up → show
        hiding = false;
        Animated.spring(isTabBarVisible, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }).start();
      }

      lastScrollY.current = currentY;
    };
  }, [lastScrollY, isTabBarVisible]);

  return { onScroll };
}
