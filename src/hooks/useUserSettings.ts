import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';

export const useUserSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<{ theme: string; dashboardLayout?: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      const docRef = doc(db, 'users', user.uid, 'settings', 'userSettings');
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as any);
        } else {
          setSettings({ theme: 'light' });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, docRef.path);
      }
    };
    fetchSettings();
  }, [user]);

  const saveSettings = async (newSettings: { theme: string; dashboardLayout?: string }) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid, 'settings', 'userSettings');
    try {
      await setDoc(docRef, newSettings, { merge: true });
      setSettings(newSettings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docRef.path);
    }
  };

  return { settings, saveSettings };
};
