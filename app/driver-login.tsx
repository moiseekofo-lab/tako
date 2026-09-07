import Login from './login';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

export default function DriverLogin() {
  const [portalReady, setPortalReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (window.parent === window) {
      window.location.replace('https://www.takotransport.com/connexion');
      return;
    }
    setPortalReady(true);
  }, []);

  return portalReady ? <Login chauffeurOnlyOverride /> : <View />;
}
