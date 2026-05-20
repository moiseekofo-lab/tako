import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';
import { activatePrepaidCard, createInternalRecharge, getAgentAccount, requestPrepaidCardCode } from '../services/api';
import { useStore } from './store';

const TAKO_BLUE = '#061F68';
const TAKO_ACTION = '#139DFF';
const TAKO_GREEN = '#09D457';
type NfcTag = { id?: string; type?: string } | null;

export default function Agent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string }>();
  const currentUser = useStore((state: any) => state.currentUser);
  const isAuthenticated = useStore((state: any) => state.isAuthenticated);
  const clearSession = useStore((state: any) => state.clearSession);
  const balance = useStore((state: any) => state.balance);
  const setBalance = useStore((state: any) => state.setBalance);
  const setCurrentUser = useStore((state: any) => state.setCurrentUser);
  const [clientId, setClientId] = useState(String(params.clientId || ''));
  const [amount, setAmount] = useState('');
  const [cardId, setCardId] = useState('');
  const [prepaidCardId, setPrepaidCardId] = useState('');
  const [prepaidPhone, setPrepaidPhone] = useState('');
  const [prepaidCode, setPrepaidCode] = useState('');
  const [isReadingNfc, setIsReadingNfc] = useState(false);
  const [isReadingPrepaidNfc, setIsReadingPrepaidNfc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prepaidLoading, setPrepaidLoading] = useState(false);
  const [prepaidMessage, setPrepaidMessage] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'recharge' | 'prepaid'>('recharge');
  const [rechargeMode, setRechargeMode] = useState<'choices' | 'qr' | 'nfc' | 'id'>('choices');
  const [rechargeStep, setRechargeStep] = useState<'identify' | 'amount'>('identify');
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && !isAuthenticated) {
      router.replace('/login' as any);
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return undefined;
    }

    let mounted = true;
    let manager: any = null;

    const startNfc = async () => {
      try {
        const module = await import('react-native-nfc-manager');
        manager = module.default;
        const supported = await manager.isSupported();
        if (mounted && supported) {
          await manager.start();
        }
      } catch {
        manager = null;
      }
    };

    startNfc();

    return () => {
      mounted = false;
      manager?.cancelTechnologyRequest?.().catch?.(() => {});
    };
  }, []);

  useEffect(() => {
    if (params.clientId) {
      setActiveSection('recharge');
      setRechargeMode('qr');
      setRechargeStep('amount');
      setClientId(String(params.clientId));
      setCardId('');
    }
  }, [params.clientId]);

  const refreshAgentAccount = async (silent = false) => {
    const agentId = currentUser?.id;
    if (!agentId || agentId === '1000000001') {
      return;
    }

    try {
      if (!silent) {
        setRefreshingBalance(true);
      }
      const result = await getAgentAccount(agentId);
      if (result?.agent) {
        setCurrentUser(result.agent);
        setBalance(Number(result.agent.balance || 0));
        setLastSync(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch {
      // Le compte reste utilisable même si le réseau tombe pendant quelques secondes.
    } finally {
      if (!silent) {
        setRefreshingBalance(false);
      }
    }
  };

  useEffect(() => {
    refreshAgentAccount(true);
    const interval = setInterval(() => refreshAgentAccount(true), 3000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const getCardId = (tag: NfcTag) => tag?.id || tag?.type || '';

  const readNfcCard = async () => {
    let manager: { cancelTechnologyRequest?: () => Promise<void> } | null = null;

    try {
      if (Platform.OS === 'web') {
        Alert.alert('NFC indisponible', 'La lecture NFC fonctionne sur l’application mobile installée.');
        return;
      }

      setIsReadingNfc(true);
      const module = await import('react-native-nfc-manager');
      const NfcManager = module.default;
      const { NfcTech } = module;
      manager = NfcManager;
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Approchez la carte du passager',
      });
      const tag = await NfcManager.getTag();
      const nextCardId = getCardId(tag);

      if (!nextCardId) {
        Alert.alert('Carte non reconnue', "Impossible de lire l'identifiant NFC.");
        return;
      }

      setRechargeMode('nfc');
      setRechargeStep('amount');
      setCardId(nextCardId);
      setClientId('');
      Alert.alert('Carte lue', 'Ajoutez le montant puis confirmez la recharge.');
    } catch {
      Alert.alert('Lecture annulée', 'Aucune carte NFC lue.');
    } finally {
      setIsReadingNfc(false);
      manager?.cancelTechnologyRequest?.().catch(() => {});
    }
  };

  const readPrepaidNfcCard = async () => {
    let manager: { cancelTechnologyRequest?: () => Promise<void> } | null = null;

    try {
      if (Platform.OS === 'web') {
        Alert.alert('NFC indisponible', 'La lecture NFC fonctionne sur l’application mobile installée.');
        return;
      }

      setIsReadingPrepaidNfc(true);
      const module = await import('react-native-nfc-manager');
      const NfcManager = module.default;
      const { NfcTech } = module;
      manager = NfcManager;
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Approchez la carte NFC vierge',
      });
      const tag = await NfcManager.getTag();
      const nextCardId = getCardId(tag);

      if (!nextCardId) {
        Alert.alert('Carte non reconnue', "Impossible de lire l'identifiant NFC.");
        return;
      }

      setPrepaidCardId(nextCardId);
      setPrepaidMessage('Carte NFC vierge lue. Entrez le numéro puis envoyez le code.');
    } catch {
      Alert.alert('Lecture annulée', 'Aucune carte NFC lue.');
    } finally {
      setIsReadingPrepaidNfc(false);
      manager?.cancelTechnologyRequest?.().catch(() => {});
    }
  };

  const sendPrepaidCode = async () => {
    const cleanPhone = prepaidPhone.trim();
    if (!cleanPhone) {
      Alert.alert('Téléphone obligatoire', 'Entrez le numéro de téléphone du client.');
      return;
    }

    try {
      setPrepaidLoading(true);
      const result = await requestPrepaidCardCode(cleanPhone);
      setPrepaidMessage(result?.code ? `Code généré : ${result.code}. Entrez-le pour confirmer.` : 'Code envoyé. Entrez le code reçu.');
    } catch (error) {
      Alert.alert('Code non envoyé', error instanceof Error ? error.message : 'Réessayez plus tard.');
    } finally {
      setPrepaidLoading(false);
    }
  };

  const confirmPrepaidCard = async () => {
    const cleanPhone = prepaidPhone.trim();
    const cleanCode = prepaidCode.trim();
    const cleanCardId = prepaidCardId.trim();

    if (!cleanPhone || !cleanCode || !cleanCardId) {
      Alert.alert('Informations obligatoires', 'Lisez la carte, entrez le téléphone et le code reçu.');
      return;
    }

    try {
      setPrepaidLoading(true);
      const result = await activatePrepaidCard({
        phone: cleanPhone,
        code: cleanCode,
        cardId: cleanCardId,
        operatorId: currentUser?.id || 'AGENT',
      });

      setPrepaidCode('');
      setPrepaidCardId('');
      setPrepaidMessage(`Carte activée pour le compte ${result?.client?.id}.`);
      Alert.alert('Carte activée', `Carte prépayée associée au compte ${result?.client?.id}.`);
    } catch (error) {
      Alert.alert('Activation impossible', error instanceof Error ? error.message : 'Vérifiez le code ou la carte.');
    } finally {
      setPrepaidLoading(false);
    }
  };

  const openRechargeMode = (mode: 'qr' | 'nfc' | 'id') => {
    setActiveSection('recharge');
    setRechargeMode(mode);
    setAmount('');
    setCardId('');
    if (mode !== 'qr') {
      setClientId('');
    }

    if (mode === 'qr') {
      router.push({
        pathname: '/internal-recharge-scan',
        params: { returnTo: 'agent' },
      } as any);
    }
  };

  const backToRechargeChoices = () => {
    setRechargeMode('choices');
    setClientId('');
    setCardId('');
    setAmount('');
  };
  const goToAmountStep = () => {
    if (rechargeMode === 'id' && !clientId.trim()) {
      Alert.alert('ID obligatoire', 'Entrez l’ID du passager avant de continuer.');
      return;
    }

    if (rechargeMode === 'nfc' && !cardId.trim()) {
      Alert.alert('Carte obligatoire', 'Lisez la carte NFC avant de continuer.');
      return;
    }

    if (rechargeMode === 'qr' && !clientId.trim()) {
      Alert.alert('QR obligatoire', 'Scannez le QR code du passager avant de continuer.');
      return;
    }

    setRechargeStep('amount');
  };

  const confirmRecharge = async () => {
    const value = Number.parseInt(amount, 10);
    const cleanClientId = clientId.trim();
    const cleanCardId = cardId.trim();

    if ((!cleanClientId && !cleanCardId) || !Number.isFinite(value) || value <= 0) {
      Alert.alert('Informations obligatoires', 'Scannez le QR, lisez la carte NFC ou entrez l’ID, puis ajoutez le montant.');
      return;
    }

    try {
      setLoading(true);
      const result = await createInternalRecharge({
        clientId: cleanClientId || undefined,
        cardId: cleanCardId || undefined,
        amount: value,
        agentId: currentUser?.id || 'AGENT',
      });

      setAmount('');
      setCardId('');
      setClientId(result?.client?.id || cleanClientId);
      if (result?.agent?.balance !== undefined) {
        setBalance(Number(result.agent.balance || 0));
        setCurrentUser(result.agent);
      }
      setLastSync(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      setRechargeMode('choices');
      setRechargeStep('identify');
      Alert.alert('Crédit envoyé', `${value} FC ajouté au compte ${result?.client?.id || cleanClientId}.`);
    } catch (error) {
      Alert.alert('Recharge impossible', error instanceof Error ? error.message : 'Vérifiez le compte ou la carte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TakoLogo />
          <TouchableOpacity
            style={styles.menuButton}
            activeOpacity={0.85}
            onPress={() => setMenuOpen((value) => !value)}>
            <Ionicons name={menuOpen ? 'close' : 'menu'} size={24} color={TAKO_BLUE} />
          </TouchableOpacity>
        </View>

        {menuOpen ? (
          <View style={styles.menuCard}>
            <View style={styles.menuUserRow}>
              <View style={styles.menuAvatar}>
                <Ionicons name="person" size={22} color="white" />
              </View>
              <View style={styles.menuUserText}>
                <Text style={styles.menuName}>{currentUser?.fullName || 'Agent TaKo'}</Text>
                <Text style={styles.menuMeta}>{currentUser?.email || currentUser?.phone || currentUser?.id}</Text>
              </View>
            </View>

            <View style={styles.menuInfoGrid}>
              <View style={styles.menuInfoItem}>
                <Text style={styles.menuInfoLabel}>ID agent</Text>
                <Text style={styles.menuInfoValue}>{currentUser?.id || 'AGENT'}</Text>
              </View>
              <View style={styles.menuInfoItem}>
                <Text style={styles.menuInfoLabel}>Solde</Text>
                <Text style={styles.menuInfoValue}>{balance} FC</Text>
              </View>
            </View>

            <View style={styles.menuSectionList}>
              <TouchableOpacity
                style={[styles.menuSectionButton, activeSection === 'recharge' && styles.menuSectionButtonActive]}
                activeOpacity={0.85}
                onPress={() => {
                  setActiveSection('recharge');
                  setMenuOpen(false);
                }}>
                <Ionicons name="wallet-outline" size={19} color={activeSection === 'recharge' ? 'white' : TAKO_BLUE} />
                <Text style={[styles.menuSectionText, activeSection === 'recharge' && styles.menuSectionTextActive]}>Recharge client</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuSectionButton, activeSection === 'prepaid' && styles.menuSectionButtonActive]}
                activeOpacity={0.85}
                onPress={() => {
                  setActiveSection('prepaid');
                  setMenuOpen(false);
                }}>
                <MaterialCommunityIcons name="credit-card-plus-outline" size={20} color={activeSection === 'prepaid' ? 'white' : TAKO_BLUE} />
                <Text style={[styles.menuSectionText, activeSection === 'prepaid' && styles.menuSectionTextActive]}>Carte prépayée</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.menuRefreshButton} activeOpacity={0.85} disabled={refreshingBalance} onPress={() => refreshAgentAccount(false)}>
              {refreshingBalance ? <ActivityIndicator color={TAKO_BLUE} /> : <Ionicons name="refresh" size={19} color={TAKO_BLUE} />}
              <Text style={styles.menuRefreshText}>{refreshingBalance ? 'Actualisation...' : 'Actualiser mes données'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuLogoutButton}
              activeOpacity={0.85}
              onPress={() => {
                clearSession();
                router.replace('/login' as any);
              }}>
              <Ionicons name="log-out-outline" size={20} color="white" />
              <Text style={styles.menuLogoutText}>Déconnexion</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.kicker}>Mode agent</Text>
        <Text style={styles.title}>{activeSection === 'prepaid' ? 'Carte prépayée' : 'Recharge interne'}</Text>
        <Text style={styles.subtitle}>
          {activeSection === 'prepaid'
            ? 'Activez une carte NFC vierge depuis une section séparée.'
            : 'Scannez le QR, lisez la carte NFC ou saisissez l’ID du passager.'}
        </Text>

        <View style={styles.agentBalanceCard}>
          <View>
            <Text style={styles.agentLabel}>ID agent</Text>
            <Text style={styles.agentValue}>{currentUser?.id || 'AGENT'}</Text>
          </View>
          <View style={styles.agentBalanceBox}>
            <Text style={styles.agentLabel}>Solde disponible</Text>
            <Text style={styles.agentBalance}>{balance} FC</Text>
          </View>
          <Text style={styles.agentHint}>
            Ce solde est crédité uniquement par l’administrateur. L’espèce est remise en fin de journée.
            {lastSync ? ` Dernière actualisation : ${lastSync}.` : ''}
          </Text>
        </View>

        {activeSection === 'recharge' ? (
        <View style={styles.card}>
          {rechargeMode === 'choices' ? (
            <>
              <Text style={styles.sectionTitle}>Recharger un client</Text>
              <Text style={styles.sectionText}>Choisissez la méthode. Chaque recharge passe par une page dédiée avant le montant.</Text>

              <View style={styles.choiceGrid}>
                <TouchableOpacity style={styles.choiceButton} activeOpacity={0.9} onPress={() => openRechargeMode('nfc')}>
                  <View style={styles.choiceIcon}>
                    <MaterialCommunityIcons name="nfc" size={26} color={TAKO_BLUE} />
                  </View>
                  <View style={styles.choiceTextWrap}>
                    <Text style={styles.choiceTitle}>Par carte NFC</Text>
                    <Text style={styles.choiceText}>Lire la carte du passager.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8B95A5" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.choiceButton} activeOpacity={0.9} onPress={() => openRechargeMode('qr')}>
                  <View style={styles.choiceIcon}>
                    <Ionicons name="qr-code-outline" size={25} color={TAKO_BLUE} />
                  </View>
                  <View style={styles.choiceTextWrap}>
                    <Text style={styles.choiceTitle}>Par QR code</Text>
                    <Text style={styles.choiceText}>Scanner le QR du compte client.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8B95A5" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.choiceButton} activeOpacity={0.9} onPress={() => openRechargeMode('id')}>
                  <View style={styles.choiceIcon}>
                    <Ionicons name="finger-print" size={25} color={TAKO_BLUE} />
                  </View>
                  <View style={styles.choiceTextWrap}>
                    <Text style={styles.choiceTitle}>Par ID client</Text>
                    <Text style={styles.choiceText}>Saisir l’ID numérique du passager.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8B95A5" />
                </TouchableOpacity>
              </View>
            </>
          ) : rechargeStep === 'identify' ? (
            <>
              <View style={styles.flowHeader}>
                <TouchableOpacity style={styles.flowBackButton} activeOpacity={0.85} onPress={backToRechargeChoices}>
                  <Ionicons name="chevron-back" size={20} color={TAKO_BLUE} />
                </TouchableOpacity>
                <View style={styles.flowTitleWrap}>
                  <Text style={styles.sectionTitle}>
                    {rechargeMode === 'nfc' ? 'Lire la carte' : rechargeMode === 'qr' ? 'Scanner le QR code' : 'ID du passager'}
                  </Text>
                  <Text style={styles.sectionText}>
                    {rechargeMode === 'nfc'
                      ? 'Approchez la carte NFC du client. Après lecture, vous ajouterez le montant.'
                      : rechargeMode === 'qr'
                        ? 'Scannez le QR code du client. Après scan, vous ajouterez le montant.'
                        : 'Entrez l’ID du passager puis confirmez pour passer au montant.'}
                  </Text>
                </View>
              </View>

              <View style={styles.stepPage}>
                {rechargeMode === 'nfc' ? (
                  <>
                    <View style={styles.stepIconLarge}>
                      <MaterialCommunityIcons name="nfc" size={42} color={TAKO_BLUE} />
                    </View>
                    <Text style={styles.stepTitle}>Approchez la carte</Text>
                    <Text style={styles.stepText}>La page montant s’ouvrira après la lecture de la carte.</Text>
                    <TouchableOpacity style={styles.nfcButton} activeOpacity={0.9} disabled={isReadingNfc} onPress={readNfcCard}>
                      {isReadingNfc ? <ActivityIndicator color={TAKO_BLUE} /> : <MaterialCommunityIcons name="nfc" size={24} color={TAKO_BLUE} />}
                      <Text style={styles.nfcButtonText}>{isReadingNfc ? 'Lecture NFC...' : 'Lire carte NFC'}</Text>
                    </TouchableOpacity>
                  </>
                ) : null}

                {rechargeMode === 'qr' ? (
                  <>
                    <View style={styles.stepIconLarge}>
                      <Ionicons name="qr-code-outline" size={42} color={TAKO_BLUE} />
                    </View>
                    <Text style={styles.stepTitle}>Scanner le QR code</Text>
                    <Text style={styles.stepText}>Le client sera confirmé automatiquement après le scan.</Text>
                    <TouchableOpacity style={styles.scanButton} activeOpacity={0.9} onPress={() => openRechargeMode('qr')}>
                      <Ionicons name="scan-outline" size={22} color="white" />
                      <Text style={styles.scanButtonText}>Scanner QR client</Text>
                    </TouchableOpacity>
                  </>
                ) : null}

                {rechargeMode === 'id' ? (
                  <>
                    <View style={styles.inputBox}>
                      <Ionicons name="person-circle-outline" size={23} color="#7B8798" />
                      <TextInput
                        placeholder="ID du passager"
                        placeholderTextColor="#8B95A5"
                        value={clientId}
                        onChangeText={(value) => {
                          setClientId(value);
                          if (value.trim()) {
                            setCardId('');
                          }
                        }}
                        keyboardType="number-pad"
                        style={styles.input}
                      />
                    </View>
                    <TouchableOpacity style={styles.confirmButton} activeOpacity={0.9} onPress={goToAmountStep}>
                      <Ionicons name="checkmark-circle" size={23} color="white" />
                      <Text style={styles.confirmButtonText}>Confirmer le passager</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </>
          ) : (
            <>
              <View style={styles.flowHeader}>
                <TouchableOpacity style={styles.flowBackButton} activeOpacity={0.85} onPress={() => setRechargeStep('identify')}>
                  <Ionicons name="chevron-back" size={20} color={TAKO_BLUE} />
                </TouchableOpacity>
                <View style={styles.flowTitleWrap}>
                  <Text style={styles.sectionTitle}>Montant</Text>
                  <Text style={styles.sectionText}>Ajoutez le montant reçu, puis confirmez la recharge.</Text>
                </View>
              </View>

              <View style={styles.stepPage}>
                <View style={styles.clientSummaryBox}>
                  <Ionicons name={cardId ? 'card-outline' : 'person-circle-outline'} size={24} color={TAKO_BLUE} />
                  <View style={styles.clientSummaryText}>
                    <Text style={styles.optionTitle}>{cardId ? 'Carte NFC lue' : 'Passager confirmé'}</Text>
                    <Text style={styles.optionSubtitle}>{cardId || clientId}</Text>
                  </View>
                </View>

                <View style={styles.inputBox}>
                  <Text style={styles.currency}>FC</Text>
                  <TextInput
                    placeholder="Montant"
                    placeholderTextColor="#8B95A5"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </View>
                <TouchableOpacity style={styles.confirmButton} activeOpacity={0.9} disabled={loading} onPress={confirmRecharge}>
                  {loading ? <ActivityIndicator color="white" /> : <Ionicons name="checkmark-circle" size={23} color="white" />}
                  <Text style={styles.confirmButtonText}>Confirmer la recharge</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
        ) : null}

        {activeSection === 'prepaid' ? (
        <View style={[styles.card, styles.prepaidCard]}>
          <Text style={styles.sectionTitle}>Carte prépayée</Text>
          <Text style={styles.sectionText}>Activez une carte NFC vierge pour un client sans smartphone.</Text>

          <View style={styles.optionBlock}>
            <View style={styles.optionHeader}>
              <View style={styles.optionIcon}>
                <MaterialCommunityIcons name="credit-card-plus-outline" size={21} color={TAKO_BLUE} />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>1. Lire la carte</Text>
                <Text style={styles.optionSubtitle}>Approcher une carte NFC vierge.</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.nfcButton} activeOpacity={0.9} disabled={isReadingPrepaidNfc} onPress={readPrepaidNfcCard}>
              {isReadingPrepaidNfc ? <ActivityIndicator color={TAKO_BLUE} /> : <MaterialCommunityIcons name="nfc" size={24} color={TAKO_BLUE} />}
              <Text style={styles.nfcButtonText}>{isReadingPrepaidNfc ? 'Lecture NFC...' : 'Lire carte vierge NFC'}</Text>
            </TouchableOpacity>
            {!!prepaidCardId && (
              <View style={styles.cardReadBox}>
                <MaterialCommunityIcons name="credit-card-check" size={20} color={TAKO_GREEN} />
                <Text style={styles.cardReadText}>Carte vierge lue : {prepaidCardId}</Text>
              </View>
            )}
          </View>

          <View style={styles.optionBlock}>
            <View style={styles.optionHeader}>
              <View style={styles.optionIcon}>
                <Ionicons name="call-outline" size={20} color={TAKO_BLUE} />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>2. Confirmer le numéro</Text>
                <Text style={styles.optionSubtitle}>Un code est envoyé au téléphone du client.</Text>
              </View>
            </View>
            <View style={styles.inputBox}>
              <Ionicons name="call-outline" size={23} color="#7B8798" />
              <TextInput
                placeholder="Numéro du client"
                placeholderTextColor="#8B95A5"
                value={prepaidPhone}
                onChangeText={setPrepaidPhone}
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>
            <TouchableOpacity style={styles.nfcButton} activeOpacity={0.9} disabled={prepaidLoading} onPress={sendPrepaidCode}>
              {prepaidLoading ? <ActivityIndicator color={TAKO_BLUE} /> : <Ionicons name="send-outline" size={21} color={TAKO_BLUE} />}
              <Text style={styles.nfcButtonText}>Envoyer le code</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.optionBlock, styles.amountBlock]}>
            <View style={styles.optionHeader}>
              <View style={styles.optionIcon}>
                <Ionicons name="keypad-outline" size={20} color={TAKO_BLUE} />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>3. Activer la carte</Text>
                <Text style={styles.optionSubtitle}>Entrer le code reçu puis associer la carte.</Text>
              </View>
            </View>
            <View style={styles.inputBox}>
              <Ionicons name="keypad-outline" size={23} color="#7B8798" />
              <TextInput
                placeholder="Code reçu"
                placeholderTextColor="#8B95A5"
                value={prepaidCode}
                onChangeText={setPrepaidCode}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
            {!!prepaidMessage && <Text style={styles.prepaidMessage}>{prepaidMessage}</Text>}
            <TouchableOpacity style={styles.confirmButton} activeOpacity={0.9} disabled={prepaidLoading} onPress={confirmPrepaidCard}>
              {prepaidLoading ? <ActivityIndicator color="white" /> : <Ionicons name="checkmark-circle" size={23} color="white" />}
              <Text style={styles.confirmButtonText}>Activer la carte</Text>
            </TouchableOpacity>
          </View>
        </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F8FF',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 54,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 34,
  },
  menuButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBDFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  menuCard: {
    borderRadius: 18,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D7E0EF',
    padding: 16,
    marginTop: -18,
    marginBottom: 24,
    shadowColor: '#061F68',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  menuUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  menuAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: TAKO_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuUserText: {
    flex: 1,
  },
  menuName: {
    color: TAKO_BLUE,
    fontSize: 15,
    fontWeight: '900',
  },
  menuMeta: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  menuInfoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  menuInfoItem: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#F5F8FF',
    padding: 12,
  },
  menuInfoLabel: {
    color: '#7B8798',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  menuInfoValue: {
    color: TAKO_BLUE,
    fontSize: 15,
    fontWeight: '900',
  },
  menuSectionList: {
    gap: 8,
    marginBottom: 12,
  },
  menuSectionButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F5F8FF',
    borderWidth: 1,
    borderColor: '#D7E0EF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  menuSectionButtonActive: {
    backgroundColor: TAKO_BLUE,
    borderColor: TAKO_BLUE,
  },
  menuSectionText: {
    color: TAKO_BLUE,
    fontSize: 14,
    fontWeight: '900',
  },
  menuSectionTextActive: {
    color: 'white',
  },
  menuRefreshButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: '#BBDFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  menuRefreshText: {
    color: TAKO_BLUE,
    fontSize: 14,
    fontWeight: '900',
  },
  menuLogoutButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: TAKO_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  menuLogoutText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
  },
  kicker: {
    color: TAKO_ACTION,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: TAKO_BLUE,
    fontSize: 31,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#5C667A',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    marginBottom: 24,
  },
  card: {
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D7E0EF',
    padding: 18,
    marginBottom: 18,
  },
  prepaidCard: {
    borderTopWidth: 4,
    borderTopColor: TAKO_ACTION,
  },
  sectionTitle: {
    color: TAKO_BLUE,
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 8,
  },
  sectionText: {
    color: '#5C667A',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 14,
  },
  choiceGrid: {
    gap: 10,
  },
  choiceButton: {
    minHeight: 74,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E8F4',
    backgroundColor: '#FBFCFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  choiceIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTextWrap: {
    flex: 1,
  },
  choiceTitle: {
    color: TAKO_BLUE,
    fontSize: 16,
    fontWeight: '900',
  },
  choiceText: {
    color: '#6A7486',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  flowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },
  flowBackButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: '#BBDFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  flowTitleWrap: {
    flex: 1,
  },
  stepPage: {
    minHeight: 260,
    borderRadius: 18,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E8F4',
    padding: 16,
    justifyContent: 'center',
    gap: 14,
  },
  stepIconLarge: {
    width: 78,
    height: 78,
    borderRadius: 22,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 2,
  },
  stepTitle: {
    color: TAKO_BLUE,
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  stepText: {
    color: '#6A7486',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 4,
  },
  clientSummaryBox: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#D7E0EF',
    backgroundColor: '#F7FAFF',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clientSummaryText: {
    flex: 1,
  },
  optionBlock: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E8F4',
    backgroundColor: '#FBFCFF',
    padding: 12,
    marginBottom: 12,
  },
  amountBlock: {
    marginBottom: 0,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    color: TAKO_BLUE,
    fontSize: 15,
    fontWeight: '900',
  },
  optionSubtitle: {
    color: '#6A7486',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  agentBalanceCard: {
    borderRadius: 18,
    backgroundColor: TAKO_BLUE,
    padding: 18,
    marginBottom: 18,
    gap: 14,
    shadowColor: '#061F68',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  agentBalanceBox: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingTop: 14,
  },
  agentLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  agentValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  agentBalance: {
    color: TAKO_GREEN,
    fontSize: 27,
    fontWeight: '900',
    marginTop: 4,
  },
  agentHint: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  scanButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: TAKO_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '900',
  },
  nfcButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: '#BBDFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  nfcButtonText: {
    color: TAKO_BLUE,
    fontSize: 15,
    fontWeight: '900',
  },
  cardReadBox: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#E9FFF1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  cardReadText: {
    flex: 1,
    color: '#087B35',
    fontSize: 13,
    fontWeight: '900',
  },
  prepaidMessage: {
    color: TAKO_BLUE,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 19,
    marginBottom: 8,
  },
  inputBox: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    backgroundColor: '#F4F5F9',
    paddingHorizontal: 16,
  },
  currency: {
    color: TAKO_BLUE,
    fontSize: 15,
    fontWeight: '900',
  },
  input: {
    flex: 1,
    color: '#202836',
    fontSize: 15,
    fontWeight: '800',
  },
  confirmButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: TAKO_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '900',
  },
});
