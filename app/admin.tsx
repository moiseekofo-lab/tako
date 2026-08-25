import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text as RNText, TextInput as RNTextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';
import { AdminNewsManager } from '../components/admin-news-manager';
import { AdminProfile } from '../components/admin-profile';
import {
  activatePrepaidCard,
  approveUser,
  createInternalRecharge,
  findClientById,
  getAdminAgents,
  getAdminClients,
  getAdminNfcCards,
  getAdminDashboard,
  getAdminDrivers,
  getAgentAccount,
  getPendingUsers,
  rechargeAgent,
  enrollAdminNfcCard,
  requestPrepaidCardCode,
  saveNfcCard,
  setNfcCardBlocked,
  updateClientByAdmin,
  updateClientStatus,
  updateAgentByAdmin,
  updateAgentStatus,
  updateDriverByAdmin,
  updateDriverStatus,
  updateAdminNfcCardStatus,
  validateAdminSession,
} from '../services/api';
import { useStore, type TransactionNotification, type TripHistoryItem } from './store';

const TAKO_BLUE = '#061F68';
const TAKO_ACTION = '#139DFF';
const TAKO_GREEN = '#09D457';
const PAGE_BG = '#F5F8FF';
const ADMIN_SESSION_KEY = 'tako:adminSession';
const LANGUAGE_KEY = 'tako:language';

const adminPhraseTranslations = {
  en: {
    'Administration TaKo': 'TaKo Administration',
    'Vue générale de l’activité TaKo.': 'Overview of TaKo activity.',
    'Vue d’ensemble de l’activité de TaKo': 'Overview of TaKo activity',
    'Transactions (période)': 'Transactions (period)',
    'Argent agent': 'Agent funds',
    'À verser aux chauffeurs': 'Payable to drivers',
    'Commission TaKo': 'TaKo commission',
    'Recharges réussies': 'Successful top-ups',
    'Versements réussis': 'Successful payouts',
    'Solde disponible total': 'Total available balance',
    'Évolution des transactions': 'Transaction trends',
    'Répartition des transactions': 'Transaction breakdown',
    'Activité en temps réel': 'Real-time activity',
    'Aucune activité récente.': 'No recent activity.',
    'Donnée indisponible': 'Data unavailable',
    'vs hier': 'vs yesterday',
    'Déconnecter': 'Log out',
    'Déconnexion': 'Log out',
    'Administrateur': 'Administrator',
    'Gestion des clients': 'Client management',
    'Gestion des chauffeurs': 'Driver management',
    'Gestion des agents': 'Agent management',
    'Ajouter un client': 'Add a client',
    'Ajouter un chauffeur': 'Add a driver',
    'Ajouter un agent': 'Add an agent',
    'Rechercher': 'Search',
    'Réinitialiser': 'Reset',
    'Exporter': 'Export',
    'Filtres': 'Filters',
    'Solde': 'Balance',
    'Statut': 'Status',
    'Actions': 'Actions',
    'Actif': 'Active',
    'Inactif': 'Inactive',
    'Bloqué': 'Blocked',
    'Suspendu': 'Suspended',
    'En attente': 'Pending',
    'Validé': 'Approved',
    'Refusé': 'Rejected',
    'Nom': 'Name',
    'Email': 'Email',
    'Client': 'Client',
    'Chauffeur': 'Driver',
    'Agent': 'Agent',
    'Montant': 'Amount',
    'Date': 'Date',
    'Voir tout': 'View all',
    'Fermer': 'Close',
    'Confirmer': 'Confirm',
    'Enregistrer': 'Save',
    'Supprimer': 'Delete',
    'Modifier': 'Edit',
    'Aujourd’hui': 'Today',
    'Confirmer la suppression': 'Confirm deletion',
    'Non': 'No',
    'Oui, supprimer': 'Yes, delete',
    'Une carte ne peut être associée qu’à un seul client.': 'A card can only be linked to one client.',
    'Associer la carte': 'Link card',
    'Créditer l’agent': 'Credit agent',
    'Annuler': 'Cancel',
    'Confirmer le crédit': 'Confirm credit',
    'Activité récente': 'Recent activity',
    'Dernières opérations connues par l’application.': 'Latest operations recorded by the application.',
    'Sécurité': 'Security',
    'Services paiement': 'Payment services',
    'Accueil': 'Home',
    'Aucun client trouvé.': 'No client found.',
    'Aucun chauffeur trouvé.': 'No driver found.',
    'Aucun agent trouvé.': 'No agent found.',
    'Informations du chauffeur': 'Driver information',
    'Informations de l’agent': 'Agent information',
    'Non disponible': 'Unavailable',
    'Valider': 'Approve',
    'Suspendre': 'Suspend',
    'Bloquer': 'Block',
    'Refuser': 'Reject',
    'Activer': 'Activate',
    'Désactiver': 'Deactivate',
    'Bloquer l’accès': 'Block access',
    'Recharge': 'Top-up',
    'Réussie': 'Successful',
    'Aucune opération enregistrée.': 'No operation recorded.',
    'Envoyer une notification': 'Send a notification',
    'Type de notification': 'Notification type',
    'Destinataires': 'Recipients',
    'Message': 'Message',
    'Évolution de l’activité': 'Activity trends',
    'Aucune donnée enregistrée': 'No data recorded',
    'Les informations réelles apparaîtront ici dès leur enregistrement.': 'Real data will appear here as soon as it is recorded.',
    'Disponible': 'Available',
    'Accès compte client': 'Client account access',
    'Entrez l’ID numérique permanent du client.': 'Enter the client’s permanent numeric ID.',
    'Voir le compte client': 'View client account',
    'Validez les comptes avant qu’ils puissent accéder à leur mode.': 'Approve accounts before they can access their mode.',
    'Recharge interne': 'Internal top-up',
    'Scannez le QR, lisez la carte NFC ou entrez l’ID du client, puis confirmez le montant.': 'Scan the QR code, read the NFC card or enter the client ID, then confirm the amount.',
    'Scanner le QR client': 'Scan client QR',
    'Confirmer la recharge': 'Confirm top-up',
    'Suivre le compte agent': 'Track agent account',
    'Envoyer au compte agent': 'Send to agent account',
    'Carte prépayée': 'Prepaid card',
    'Envoyer le code': 'Send code',
    'Activer la carte': 'Activate card',
    'Suivi compte agent': 'Agent account tracking',
    'Consultez le solde et l’activité de l’agent en temps réel.': 'View the agent balance and activity in real time.',
    'Instantané': 'Snapshot',
    'Fiche client': 'Client record',
    'Données principales et statut du compte.': 'Main data and account status.',
    'Validation chauffeur': 'Driver approval',
    'Chauffeur actif': 'Active driver',
    'Exploitation transport': 'Transport operations',
    'Canaux de paiement': 'Payment channels',
    'Cartes NFC': 'NFC cards',
    'Gérez les cartes, leur association et leur cycle de vie.': 'Manage cards, their assignment and lifecycle.',
    'Recharges': 'Top-ups',
    'Suivez les recharges clients et les confirmations opérateurs.': 'Track client top-ups and operator confirmations.',
    'Versements': 'Payouts',
    'Validez et suivez les versements destinés aux chauffeurs.': 'Approve and track driver payouts.',
    'Trésorerie': 'Treasury',
    'Soldes Mobile Money et fonds réellement disponibles.': 'Mobile Money balances and funds actually available.',
    'Rapprochement financier': 'Financial reconciliation',
    'Comparaison entre les opérations TaKo et les relevés des opérateurs.': 'Comparison between TaKo operations and operator statements.',
    'Réclamations': 'Claims',
    'Traitez les réclamations et litiges des utilisateurs.': 'Handle user claims and disputes.',
    'Notifications': 'Notifications',
    'Envoyez un message dans l’application, par SMS ou par e-mail.': 'Send an in-app, SMS or email message.',
    'Rapports': 'Reports',
    'Analyse financière et opérationnelle de TaKo.': 'Financial and operational analysis of TaKo.',
    'Administrateurs et rôles': 'Administrators and roles',
    'Gérez les accès et permissions de l’équipe.': 'Manage team access and permissions.',
    'Journal d’activité': 'Activity log',
    'Historique inaltérable des actions administratives.': 'Tamper-proof history of administrative actions.',
    'Paramètres': 'Settings',
    'Rechercher par nom, téléphone, e-mail ou ID…': 'Search by name, phone, email or ID…',
    'Rechercher par nom, téléphone ou plaque…': 'Search by name, phone or plate…',
    'Rechercher par nom, téléphone ou e-mail…': 'Search by name, phone or email…',
    'Filtrer par ligne ou zone…': 'Filter by route or zone…',
    'Zone d’affectation': 'Assigned zone',
    'Rôle': 'Role',
    'Responsable': 'Manager',
    'Votre message…': 'Your message…',
    'Montant à envoyer': 'Amount to send',
    'Numéro de téléphone': 'Phone number',
    'Code reçu': 'Code received',
    'Non renseigné': 'Not provided',
    'Total clients': 'Total clients',
    'Clients actifs': 'Active clients',
    'Clients inactifs': 'Inactive clients',
    'Clients bloqués': 'Blocked clients',
    'du total': 'of total',
    'Données réelles': 'Live data',
    'Tous les clients': 'All clients',
    'Tous': 'All',
    'Actifs': 'Active',
    'Inactifs': 'Inactive',
    'Bloqués': 'Blocked',
    'Toutes cartes': 'All cards',
    'Avec NFC': 'With NFC',
    'Sans NFC': 'Without NFC',
    'E-mail': 'Email',
    'Solde (CDF)': 'Balance (CDF)',
    'Carte NFC': 'NFC card',
    'Inscription': 'Registration',
    'Dernière connexion': 'Last login',
    'Aucune': 'None',
    'Active': 'Active',
    'Suspendue': 'Suspended',
    'active': 'active',
    'inactive': 'inactive',
    'blocked': 'blocked',
    'client(s)': 'client(s)',
    'Total chauffeurs': 'Total drivers',
    'Chauffeurs actifs': 'Active drivers',
    'Suspendus': 'Suspended',
    'Véhicule': 'Vehicle',
    'Plaque': 'Plate',
    'Ligne / Zone': 'Route / Zone',
    'Solde disponible': 'Available balance',
    'Total gagné': 'Total earned',
    'Validation': 'Approval',
    'En vérification': 'Under review',
    'chauffeur(s)': 'driver(s)',
    'Nom complet': 'Full name',
    'Paiements reçus': 'Payments received',
    'Opérateur de retrait': 'Withdrawal operator',
    'Total agents': 'Total agents',
    'Agents actifs': 'Active agents',
    'Désactivés': 'Deactivated',
    'Agent terrain': 'Field agent',
    'Superviseur': 'Supervisor',
    'Date de création': 'Creation date',
    'agent(s)': 'agent(s)',
    'Modifier le client': 'Edit client',
    'Profil client': 'Client profile',
    'Téléphone': 'Phone',
    'Date de naissance': 'Date of birth',
    'Trajets': 'Trips',
    'Voulez-vous supprimer le client': 'Do you want to delete client',
    'Voulez-vous supprimer le chauffeur': 'Do you want to delete driver',
    'Voulez-vous supprimer l’agent': 'Do you want to delete agent',
    'de la liste ? Son historique financier sera conservé.': 'from the list? Their financial history will be kept.',
    'de la liste ? Son historique sera conservé.': 'from the list? Their history will be kept.',
    'Ajoutez de l’argent au compte de': 'Add funds to the account of',
    'Montant en FC': 'Amount in FC',
    'Modifier le chauffeur': 'Edit driver',
    'Profil chauffeur': 'Driver profile',
    'Modifier l’agent': 'Edit agent',
    'Profil agent': 'Agent profile',
    'Mettre à jour': 'Update',
    'Gestion et suivi des opérations.': 'Operations management and monitoring.',
    'Tous droits réservés 2026': 'All rights reserved 2026',
  },
  pt: {
    'Administration TaKo': 'Administração TaKo',
    'Vue générale de l’activité TaKo.': 'Visão geral da atividade da TaKo.',
    'Vue d’ensemble de l’activité de TaKo': 'Visão geral da atividade da TaKo',
    'Transactions (période)': 'Transações (período)',
    'Argent agent': 'Dinheiro dos agentes',
    'À verser aux chauffeurs': 'A pagar aos motoristas',
    'Commission TaKo': 'Comissão TaKo',
    'Recharges réussies': 'Recargas bem-sucedidas',
    'Versements réussis': 'Pagamentos bem-sucedidos',
    'Solde disponible total': 'Saldo total disponível',
    'Évolution des transactions': 'Evolução das transações',
    'Répartition des transactions': 'Distribuição das transações',
    'Activité en temps réel': 'Atividade em tempo real',
    'Aucune activité récente.': 'Nenhuma atividade recente.',
    'Donnée indisponible': 'Dados indisponíveis',
    'vs hier': 'vs ontem',
    'Déconnecter': 'Sair',
    'Déconnexion': 'Sair',
    'Administrateur': 'Administrador',
    'Gestion des clients': 'Gestão de clientes',
    'Gestion des chauffeurs': 'Gestão de motoristas',
    'Gestion des agents': 'Gestão de agentes',
    'Ajouter un client': 'Adicionar cliente',
    'Ajouter un chauffeur': 'Adicionar motorista',
    'Ajouter un agent': 'Adicionar agente',
    'Rechercher': 'Pesquisar',
    'Réinitialiser': 'Repor',
    'Exporter': 'Exportar',
    'Filtres': 'Filtros',
    'Solde': 'Saldo',
    'Statut': 'Estado',
    'Actions': 'Ações',
    'Actif': 'Ativo',
    'Inactive': 'Inativo',
    'Inactif': 'Inativo',
    'Bloqué': 'Bloqueado',
    'Suspendu': 'Suspenso',
    'En attente': 'Pendente',
    'Validé': 'Validado',
    'Refusé': 'Recusado',
    'Nom': 'Nome',
    'Email': 'E-mail',
    'Client': 'Cliente',
    'Chauffeur': 'Motorista',
    'Agent': 'Agente',
    'Montant': 'Montante',
    'Date': 'Data',
    'Voir tout': 'Ver tudo',
    'Fermer': 'Fechar',
    'Confirmer': 'Confirmar',
    'Enregistrer': 'Guardar',
    'Supprimer': 'Eliminar',
    'Modifier': 'Editar',
    'Aujourd’hui': 'Hoje',
    'Confirmer la suppression': 'Confirmar eliminação',
    'Non': 'Não',
    'Oui, supprimer': 'Sim, eliminar',
    'Une carte ne peut être associée qu’à un seul client.': 'Um cartão só pode estar associado a um cliente.',
    'Associer la carte': 'Associar cartão',
    'Créditer l’agent': 'Creditar agente',
    'Annuler': 'Cancelar',
    'Confirmer le crédit': 'Confirmar crédito',
    'Activité récente': 'Atividade recente',
    'Dernières opérations connues par l’application.': 'Últimas operações registadas pela aplicação.',
    'Sécurité': 'Segurança',
    'Services paiement': 'Serviços de pagamento',
    'Accueil': 'Início',
    'Aucun client trouvé.': 'Nenhum cliente encontrado.',
    'Aucun chauffeur trouvé.': 'Nenhum motorista encontrado.',
    'Aucun agent trouvé.': 'Nenhum agente encontrado.',
    'Informations du chauffeur': 'Informações do motorista',
    'Informations de l’agent': 'Informações do agente',
    'Non disponible': 'Indisponível',
    'Valider': 'Validar',
    'Suspendre': 'Suspender',
    'Bloquer': 'Bloquear',
    'Refuser': 'Recusar',
    'Activer': 'Ativar',
    'Désactiver': 'Desativar',
    'Bloquer l’accès': 'Bloquear acesso',
    'Recharge': 'Recarga',
    'Réussie': 'Bem-sucedida',
    'Aucune opération enregistrée.': 'Nenhuma operação registada.',
    'Envoyer une notification': 'Enviar notificação',
    'Type de notification': 'Tipo de notificação',
    'Destinataires': 'Destinatários',
    'Message': 'Mensagem',
    'Évolution de l’activité': 'Evolução da atividade',
    'Aucune donnée enregistrée': 'Nenhum dado registado',
    'Les informations réelles apparaîtront ici dès leur enregistrement.': 'Os dados reais aparecerão aqui assim que forem registados.',
    'Disponible': 'Disponível',
    'Accès compte client': 'Acesso à conta do cliente',
    'Entrez l’ID numérique permanent du client.': 'Digite o ID numérico permanente do cliente.',
    'Voir le compte client': 'Ver conta do cliente',
    'Validez les comptes avant qu’ils puissent accéder à leur mode.': 'Valide as contas antes que possam aceder ao respetivo modo.',
    'Recharge interne': 'Recarga interna',
    'Scannez le QR, lisez la carte NFC ou entrez l’ID du client, puis confirmez le montant.': 'Digitalize o QR, leia o cartão NFC ou digite o ID do cliente e confirme o montante.',
    'Scanner le QR client': 'Digitalizar QR do cliente',
    'Confirmer la recharge': 'Confirmar recarga',
    'Suivre le compte agent': 'Acompanhar conta do agente',
    'Envoyer au compte agent': 'Enviar para a conta do agente',
    'Carte prépayée': 'Cartão pré-pago',
    'Envoyer le code': 'Enviar código',
    'Activer la carte': 'Ativar cartão',
    'Suivi compte agent': 'Acompanhamento da conta do agente',
    'Consultez le solde et l’activité de l’agent en temps réel.': 'Consulte o saldo e a atividade do agente em tempo real.',
    'Instantané': 'Resumo',
    'Fiche client': 'Ficha do cliente',
    'Données principales et statut du compte.': 'Dados principais e estado da conta.',
    'Validation chauffeur': 'Validação do motorista',
    'Chauffeur actif': 'Motorista ativo',
    'Exploitation transport': 'Operações de transporte',
    'Canaux de paiement': 'Canais de pagamento',
    'Cartes NFC': 'Cartões NFC',
    'Gérez les cartes, leur association et leur cycle de vie.': 'Faça a gestão dos cartões, associações e ciclo de vida.',
    'Recharges': 'Recargas',
    'Suivez les recharges clients et les confirmations opérateurs.': 'Acompanhe as recargas dos clientes e as confirmações dos operadores.',
    'Versements': 'Pagamentos',
    'Validez et suivez les versements destinés aux chauffeurs.': 'Valide e acompanhe os pagamentos aos motoristas.',
    'Trésorerie': 'Tesouraria',
    'Soldes Mobile Money et fonds réellement disponibles.': 'Saldos Mobile Money e fundos realmente disponíveis.',
    'Rapprochement financier': 'Reconciliação financeira',
    'Comparaison entre les opérations TaKo et les relevés des opérateurs.': 'Comparação entre as operações TaKo e os extratos dos operadores.',
    'Réclamations': 'Reclamações',
    'Traitez les réclamations et litiges des utilisateurs.': 'Trate das reclamações e litígios dos utilizadores.',
    'Notifications': 'Notificações',
    'Envoyez un message dans l’application, par SMS ou par e-mail.': 'Envie uma mensagem na aplicação, por SMS ou por e-mail.',
    'Rapports': 'Relatórios',
    'Analyse financière et opérationnelle de TaKo.': 'Análise financeira e operacional da TaKo.',
    'Administrateurs et rôles': 'Administradores e funções',
    'Gérez les accès et permissions de l’équipe.': 'Faça a gestão dos acessos e permissões da equipa.',
    'Journal d’activité': 'Registo de atividades',
    'Historique inaltérable des actions administratives.': 'Histórico inviolável das ações administrativas.',
    'Paramètres': 'Definições',
    'Rechercher par nom, téléphone, e-mail ou ID…': 'Pesquisar por nome, telefone, e-mail ou ID…',
    'Rechercher par nom, téléphone ou plaque…': 'Pesquisar por nome, telefone ou matrícula…',
    'Rechercher par nom, téléphone ou e-mail…': 'Pesquisar por nome, telefone ou e-mail…',
    'Filtrer par ligne ou zone…': 'Filtrar por linha ou zona…',
    'Zone d’affectation': 'Zona de afetação',
    'Rôle': 'Função',
    'Responsable': 'Responsável',
    'Votre message…': 'A sua mensagem…',
    'Montant à envoyer': 'Montante a enviar',
    'Numéro de téléphone': 'Número de telefone',
    'Code reçu': 'Código recebido',
    'Non renseigné': 'Não informado',
    'Total clients': 'Total de clientes',
    'Clients actifs': 'Clientes ativos',
    'Clients inactifs': 'Clientes inativos',
    'Clients bloqués': 'Clientes bloqueados',
    'du total': 'do total',
    'Données réelles': 'Dados reais',
    'Tous les clients': 'Todos os clientes',
    'Tous': 'Todos',
    'Actifs': 'Ativos',
    'Inactifs': 'Inativos',
    'Bloqués': 'Bloqueados',
    'Toutes cartes': 'Todos os cartões',
    'Avec NFC': 'Com NFC',
    'Sans NFC': 'Sem NFC',
    'E-mail': 'E-mail',
    'Solde (CDF)': 'Saldo (CDF)',
    'Carte NFC': 'Cartão NFC',
    'Inscription': 'Inscrição',
    'Dernière connexion': 'Última ligação',
    'Aucune': 'Nenhum',
    'Active': 'Ativo',
    'Suspendue': 'Suspenso',
    'active': 'ativo',
    'inactive': 'inativo',
    'blocked': 'bloqueado',
    'client(s)': 'cliente(s)',
    'Total chauffeurs': 'Total de motoristas',
    'Chauffeurs actifs': 'Motoristas ativos',
    'Suspendus': 'Suspensos',
    'Véhicule': 'Veículo',
    'Plaque': 'Matrícula',
    'Ligne / Zone': 'Linha / Zona',
    'Solde disponible': 'Saldo disponível',
    'Total gagné': 'Total ganho',
    'Validation': 'Validação',
    'En vérification': 'Em verificação',
    'chauffeur(s)': 'motorista(s)',
    'Nom complet': 'Nome completo',
    'Paiements reçus': 'Pagamentos recebidos',
    'Opérateur de retrait': 'Operador de levantamento',
    'Total agents': 'Total de agentes',
    'Agents actifs': 'Agentes ativos',
    'Désactivés': 'Desativados',
    'Agent terrain': 'Agente de campo',
    'Superviseur': 'Supervisor',
    'Date de création': 'Data de criação',
    'agent(s)': 'agente(s)',
    'Modifier le client': 'Editar cliente',
    'Profil client': 'Perfil do cliente',
    'Téléphone': 'Telefone',
    'Date de naissance': 'Data de nascimento',
    'Trajets': 'Viagens',
    'Voulez-vous supprimer le client': 'Deseja eliminar o cliente',
    'Voulez-vous supprimer le chauffeur': 'Deseja eliminar o motorista',
    'Voulez-vous supprimer l’agent': 'Deseja eliminar o agente',
    'de la liste ? Son historique financier sera conservé.': 'da lista? O histórico financeiro será conservado.',
    'de la liste ? Son historique sera conservé.': 'da lista? O histórico será conservado.',
    'Ajoutez de l’argent au compte de': 'Adicione dinheiro à conta de',
    'Montant en FC': 'Montante em FC',
    'Modifier le chauffeur': 'Editar motorista',
    'Profil chauffeur': 'Perfil do motorista',
    'Modifier l’agent': 'Editar agente',
    'Profil agent': 'Perfil do agente',
    'Mettre à jour': 'Atualizar',
    'Gestion et suivi des opérations.': 'Gestão e acompanhamento das operações.',
    'Tous droits réservés 2026': 'Todos os direitos reservados 2026',
  },
} as const;

function translateAdminString(value: string, language: 'fr' | 'en' | 'pt') {
  if (language === 'fr') return value;
  const dictionary = adminPhraseTranslations[language] as Record<string, string>;
  const trimmed = value.trim();
  if (dictionary[trimmed]) {
    return value.replace(trimmed, dictionary[trimmed]);
  }
  return Object.entries(dictionary)
    .sort(([a], [b]) => b.length - a.length)
    .reduce((translated, [source, target]) => translated.replaceAll(source, target), value);
}

function translateAdminChildren(children: ReactNode, language: 'fr' | 'en' | 'pt'): ReactNode {
  if (typeof children === 'string') return translateAdminString(children, language);
  if (Array.isArray(children)) return children.map((child) => translateAdminChildren(child, language));
  return children;
}

function Text(props: ComponentProps<typeof RNText>) {
  const language = useStore((state: any) => state.language) as 'fr' | 'en' | 'pt';
  return <RNText {...props}>{translateAdminChildren(props.children, language)}</RNText>;
}

function TextInput(props: ComponentProps<typeof RNTextInput>) {
  const language = useStore((state: any) => state.language) as 'fr' | 'en' | 'pt';
  const placeholder = typeof props.placeholder === 'string'
    ? translateAdminString(props.placeholder, language)
    : props.placeholder;
  return (
    <RNTextInput
      {...props}
      placeholder={placeholder}
      style={[props.style, Platform.OS === 'web' ? ({ userSelect: 'text' } as any) : null]}
    />
  );
}
const WEB_SCROLLBAR_STYLE = Platform.OS === 'web'
  ? ({
      overflowY: 'auto',
    } as any)
  : null;
type NfcTag = { id?: string; type?: string } | null;

type AdminSection =
  | 'dashboard'
  | 'profile'
  | 'clients'
  | 'drivers'
  | 'agents'
  | 'nfcCards'
  | 'transactions'
  | 'recharges'
  | 'payouts'
  | 'treasury'
  | 'reconciliation'
  | 'claims'
  | 'news'
  | 'notifications'
  | 'reports'
  | 'roles'
  | 'audit'
  | 'settings';

const navItems: Array<{ key: AdminSection; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'dashboard', label: 'Tableau de bord', icon: 'grid-outline' },
  { key: 'clients', label: 'Clients', icon: 'people-outline' },
  { key: 'drivers', label: 'Chauffeurs', icon: 'bus-outline' },
  { key: 'agents', label: 'Agents', icon: 'person-add-outline' },
  { key: 'nfcCards', label: 'Cartes NFC', icon: 'card-outline' },
  { key: 'transactions', label: 'Transactions', icon: 'receipt-outline' },
  { key: 'recharges', label: 'Recharges', icon: 'add-circle-outline' },
  { key: 'payouts', label: 'Versements', icon: 'cash-outline' },
  { key: 'treasury', label: 'Trésorerie', icon: 'wallet-outline' },
  { key: 'reconciliation', label: 'Rapprochement', icon: 'git-compare-outline' },
  { key: 'claims', label: 'Réclamations', icon: 'chatbox-ellipses-outline' },
  { key: 'news', label: 'Actualités', icon: 'megaphone-outline' },
  { key: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
  { key: 'reports', label: 'Rapports', icon: 'bar-chart-outline' },
  { key: 'roles', label: 'Administrateurs et rôles', icon: 'shield-checkmark-outline' },
  { key: 'audit', label: 'Journal d’activité', icon: 'list-outline' },
  { key: 'settings', label: 'Paramètres', icon: 'settings-outline' },
];

const adminNavTranslations: Record<'fr' | 'en' | 'pt', Record<AdminSection, string>> = {
  fr: { ...Object.fromEntries(navItems.map((item) => [item.key, item.label])), profile: 'Mon profil' } as Record<AdminSection, string>,
  en: {
    dashboard: 'Dashboard', profile: 'My profile', clients: 'Clients', drivers: 'Drivers', agents: 'Agents',
    nfcCards: 'NFC cards', transactions: 'Transactions', recharges: 'Top-ups',
    payouts: 'Payouts', treasury: 'Treasury', reconciliation: 'Reconciliation',
    claims: 'Claims', news: 'News', notifications: 'Notifications', reports: 'Reports',
    roles: 'Administrators and roles', audit: 'Activity log', settings: 'Settings',
  },
  pt: {
    dashboard: 'Painel', profile: 'Meu perfil', clients: 'Clientes', drivers: 'Motoristas', agents: 'Agentes',
    nfcCards: 'Cartões NFC', transactions: 'Transações', recharges: 'Recargas',
    payouts: 'Pagamentos', treasury: 'Tesouraria', reconciliation: 'Reconciliação',
    claims: 'Reclamações', news: 'Notícias', notifications: 'Notificações', reports: 'Relatórios',
    roles: 'Administradores e funções', audit: 'Registo de atividades', settings: 'Definições',
  },
};

type ModuleDefinition = {
  title: string;
  description: string;
  columns: string[];
  primaryAction: string;
  kind?: 'table' | 'treasury' | 'notifications' | 'reports';
};

const moduleContent: Partial<Record<AdminSection, ModuleDefinition>> = {
  nfcCards: {
    title: 'Cartes NFC',
    description: 'Gérez les cartes, leur association et leur cycle de vie.',
    columns: ['N° de série', 'UID NFC', 'Client', 'Statut', 'Activation', 'Actions'],
    primaryAction: 'Ajouter des cartes',
  },
  recharges: {
    title: 'Recharges',
    description: 'Suivez les recharges clients et les confirmations opérateurs.',
    columns: ['Client', 'Montant', 'Opérateur', 'Référence', 'Date', 'Statut'],
    primaryAction: 'Nouvelle recharge',
  },
  payouts: {
    title: 'Versements',
    description: 'Validez et suivez les versements destinés aux chauffeurs.',
    columns: ['Chauffeur', 'Montant', 'Opérateur', 'Référence', 'Date', 'Statut'],
    primaryAction: 'Nouveau versement',
  },
  treasury: {
    title: 'Trésorerie',
    description: 'Soldes Mobile Money et fonds réellement disponibles.',
    columns: ['Date', 'Opérateur', 'Type', 'Description', 'Montant', 'Solde'],
    primaryAction: 'Actualiser',
    kind: 'treasury',
  },
  reconciliation: {
    title: 'Rapprochement financier',
    description: 'Comparaison entre les opérations TaKo et les relevés des opérateurs.',
    columns: ['Date', 'Opérateur', 'Type d’écart', 'Référence TaKo', 'Montant', 'Statut'],
    primaryAction: 'Lancer le rapprochement',
  },
  claims: {
    title: 'Réclamations',
    description: 'Traitez les réclamations et litiges des utilisateurs.',
    columns: ['N° dossier', 'Utilisateur', 'Catégorie', 'Description', 'Statut', 'Date'],
    primaryAction: 'Nouvelle réclamation',
  },
  notifications: {
    title: 'Notifications',
    description: 'Envoyez un message dans l’application, par SMS ou par e-mail.',
    columns: [],
    primaryAction: 'Envoyer la notification',
    kind: 'notifications',
  },
  reports: {
    title: 'Rapports',
    description: 'Analyse financière et opérationnelle de TaKo.',
    columns: [],
    primaryAction: 'Exporter',
    kind: 'reports',
  },
  roles: {
    title: 'Administrateurs et rôles',
    description: 'Gérez les accès et permissions de l’équipe.',
    columns: ['Utilisateur', 'Rôle', 'Permissions', 'Dernière connexion', 'Statut', 'Actions'],
    primaryAction: 'Ajouter un administrateur',
  },
  audit: {
    title: 'Journal d’activité',
    description: 'Historique inaltérable des actions administratives.',
    columns: ['Date et heure', 'Utilisateur', 'Action', 'Objet', 'Description', 'Adresse IP'],
    primaryAction: 'Exporter',
  },
};

const formatDate = (date?: string) => {
  if (!date) {
    return 'Non disponible';
  }

  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function Admin() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string }>();
  const { width } = useWindowDimensions();
  const isNarrow = width < 760;
  const currentUser = useStore((state: any) => state.currentUser);
  const language = useStore((state: any) => state.language) as 'fr' | 'en' | 'pt';
  const isAuthenticated = useStore((state: any) => state.isAuthenticated);
  const clearSession = useStore((state: any) => state.clearSession);
  const setLanguage = useStore((state: any) => state.setLanguage);
  const setCurrentUser = useStore((state: any) => state.setCurrentUser);
  const trips = useStore((state: any) => state.trips) as TripHistoryItem[];
  const notifications = useStore((state: any) => state.notifications) as TransactionNotification[];
  const balance = useStore((state: any) => state.balance);
  const driverTripInfo = useStore((state: any) => state.driverTripInfo);
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const storedLanguage = window.sessionStorage.getItem(LANGUAGE_KEY);
      if (storedLanguage === 'fr' || storedLanguage === 'en' || storedLanguage === 'pt') {
        setLanguage(storedLanguage);
      }
    }
  }, [setLanguage]);
  const [clientId, setClientId] = useState('');
  const [rechargeClientId, setRechargeClientId] = useState(String(params.clientId || ''));
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeCardId, setRechargeCardId] = useState('');
  const [prepaidCardId, setPrepaidCardId] = useState('');
  const [prepaidPhone, setPrepaidPhone] = useState('');
  const [prepaidCode, setPrepaidCode] = useState('');
  const [agentRechargeId, setAgentRechargeId] = useState('');
  const [agentRechargeAmount, setAgentRechargeAmount] = useState('');
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [isReadingNfc, setIsReadingNfc] = useState(false);
  const [isReadingPrepaidNfc, setIsReadingPrepaidNfc] = useState(false);
  const [prepaidLoading, setPrepaidLoading] = useState(false);
  const [prepaidFeedback, setPrepaidFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [rechargeFeedback, setRechargeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [clientLookupLoading, setClientLookupLoading] = useState(false);
  const [clientUpdateLoading, setClientUpdateLoading] = useState(false);
  const [clientFeedback, setClientFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [agentRechargeLoading, setAgentRechargeLoading] = useState(false);
  const [agentLookupLoading, setAgentLookupLoading] = useState(false);
  const [agentFeedback, setAgentFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [trackedAgent, setTrackedAgent] = useState<any>(null);
  const [trackedAgentStats, setTrackedAgentStats] = useState<any>(null);
  const [driverSearch, setDriverSearch] = useState('');
  const [driverStatusFilter, setDriverStatusFilter] = useState('');
  const [driverZoneFilter, setDriverZoneFilter] = useState('');
  const [driverPage, setDriverPage] = useState(1);
  const [driverDirectory, setDriverDirectory] = useState<any>({ drivers: [], stats: {}, pagination: { page: 1, total: 0, limit: 20 } });
  const [driverDirectoryLoading, setDriverDirectoryLoading] = useState(false);
  const [driverDirectoryVersion, setDriverDirectoryVersion] = useState(0);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [driverPanelMode, setDriverPanelMode] = useState<'view' | 'edit' | null>(null);
  const [driverDeleteCandidate, setDriverDeleteCandidate] = useState<any>(null);
  const [driverActionLoading, setDriverActionLoading] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');
  const [agentStatusFilter, setAgentStatusFilter] = useState('');
  const [agentZoneFilter, setAgentZoneFilter] = useState('');
  const [agentRoleFilter, setAgentRoleFilter] = useState('');
  const [agentManagerFilter, setAgentManagerFilter] = useState('');
  const [agentPage, setAgentPage] = useState(1);
  const [agentDirectory, setAgentDirectory] = useState<any>({ agents: [], stats: {}, pagination: { page: 1, total: 0, limit: 20 } });
  const [agentDirectoryLoading, setAgentDirectoryLoading] = useState(false);
  const [agentDirectoryVersion, setAgentDirectoryVersion] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [agentPanelMode, setAgentPanelMode] = useState<'view' | 'edit' | null>(null);
  const [agentDeleteCandidate, setAgentDeleteCandidate] = useState<any>(null);
  const [agentCreditCandidate, setAgentCreditCandidate] = useState<any>(null);
  const [agentCreditAmount, setAgentCreditAmount] = useState('');
  const [agentActionLoading, setAgentActionLoading] = useState(false);
  const [pendingAgents, setPendingAgents] = useState<any[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingAdminSession, setCheckingAdminSession] = useState(Platform.OS === 'web');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState('');
  const [clientCardFilter, setClientCardFilter] = useState<'' | 'with' | 'without'>('');
  const [clientPage, setClientPage] = useState(1);
  const [clientDirectory, setClientDirectory] = useState<any>({ clients: [], stats: {}, pagination: { page: 1, total: 0, limit: 20 } });
  const [clientDirectoryLoading, setClientDirectoryLoading] = useState(false);
  const [clientDirectoryVersion, setClientDirectoryVersion] = useState(0);
  const [cardManagerClient, setCardManagerClient] = useState<any>(null);
  const [managedCardId, setManagedCardId] = useState('');
  const [clientActionLoading, setClientActionLoading] = useState(false);
  const [clientPanelMode, setClientPanelMode] = useState<'view' | 'edit' | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<any>(null);
  const [nfcSearch, setNfcSearch] = useState('');
  const [nfcStatus, setNfcStatus] = useState('');
  const [nfcPage, setNfcPage] = useState(1);
  const [nfcDirectory, setNfcDirectory] = useState<any>({ cards: [], stats: {}, pagination: { page: 1, total: 0, limit: 20 } });
  const [nfcLoading, setNfcLoading] = useState(false);
  const [nfcVersion, setNfcVersion] = useState(0);
  const [nfcEnrollVisible, setNfcEnrollVisible] = useState(false);
  const [nfcEnrollClientId, setNfcEnrollClientId] = useState('');
  const [nfcEnrollCardId, setNfcEnrollCardId] = useState('');
  const [nfcSelectedCard, setNfcSelectedCard] = useState<any>(null);
  const [nfcActionLoading, setNfcActionLoading] = useState(false);

  useEffect(() => {
    if (params.clientId) {
      setRechargeClientId(String(params.clientId));
      setRechargeCardId('');
      setClientId(String(params.clientId));
      setActiveSection('clients');
    }
  }, [params.clientId]);

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

  const loadPendingUsers = async () => {
    try {
      const [agentsResult, driversResult] = await Promise.all([
        getPendingUsers('agent'),
        getPendingUsers('chauffeur'),
      ]);
      setPendingAgents(agentsResult?.users || []);
      setPendingDrivers(driversResult?.users || []);
    } catch {
      setPendingAgents([]);
      setPendingDrivers([]);
    }
  };

  useEffect(() => {
    let active = true;

    const restoreAdminSession = async () => {
      if (Platform.OS !== 'web' || isAuthenticated) {
        if (active) {
          setCheckingAdminSession(false);
          loadPendingUsers();
        }
        return;
      }

      try {
        const sessionToken = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
        if (!sessionToken) {
          throw new Error('Session absente');
        }

        const result = await validateAdminSession(sessionToken);
        if (!result?.user) {
          throw new Error('Session invalide');
        }

        if (active) {
          setCurrentUser(result.user);
          setCheckingAdminSession(false);
          loadPendingUsers();
        }
      } catch {
        await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
        if (active) {
          setCheckingAdminSession(false);
          router.replace('/login' as any);
        }
      }
    };

    restoreAdminSession();
    return () => {
      active = false;
    };
  }, [isAuthenticated, router, setCurrentUser]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated || activeSection !== 'dashboard') {
      return;
    }

    let active = true;
    const loadDashboard = () => {
      AsyncStorage.getItem(ADMIN_SESSION_KEY)
        .then((sessionToken) => {
          if (!sessionToken) {
            throw new Error('Session absente');
          }
          return getAdminDashboard(sessionToken, 'day');
        })
        .then((result) => {
          if (active) {
            setDashboardData(result?.dashboard || null);
          }
        })
        .catch(() => {
          if (active) {
            setDashboardData(null);
          }
        })
        .finally(() => {
          if (active) {
            setDashboardLoading(false);
          }
        });
    };

    setDashboardLoading(true);
    loadDashboard();
    const refreshTimer = setInterval(loadDashboard, 10000);

    return () => {
      active = false;
      clearInterval(refreshTimer);
    };
  }, [activeSection, isAuthenticated]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated || activeSection !== 'clients') {
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      setClientDirectoryLoading(true);
      AsyncStorage.getItem(ADMIN_SESSION_KEY)
        .then((sessionToken) => {
          if (!sessionToken) {
            throw new Error('Session absente');
          }
          return getAdminClients({
            sessionToken,
            search: clientSearch,
            status: clientStatusFilter,
            cardFilter: clientCardFilter,
            page: clientPage,
          });
        })
        .then((result) => {
          if (active) {
            setClientDirectory(result || { clients: [], stats: {}, pagination: { page: 1, total: 0, limit: 20 } });
          }
        })
        .catch(() => {
          if (active) {
            setClientDirectory({ clients: [], stats: {}, pagination: { page: 1, total: 0, limit: 20 } });
          }
        })
        .finally(() => {
          if (active) {
            setClientDirectoryLoading(false);
          }
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [activeSection, clientCardFilter, clientDirectoryVersion, clientPage, clientSearch, clientStatusFilter, isAuthenticated]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated || activeSection !== 'nfcCards') return;
    let active = true;
    const timer = setTimeout(() => {
      setNfcLoading(true);
      AsyncStorage.getItem(ADMIN_SESSION_KEY)
        .then((sessionToken) => {
          if (!sessionToken) throw new Error('Session absente');
          return getAdminNfcCards({ sessionToken, search: nfcSearch, status: nfcStatus, page: nfcPage });
        })
        .then((result) => { if (active) setNfcDirectory(result || { cards: [], stats: {}, pagination: { page: 1, total: 0, limit: 20 } }); })
        .catch(() => { if (active) setNfcDirectory({ cards: [], stats: {}, pagination: { page: 1, total: 0, limit: 20 } }); })
        .finally(() => { if (active) setNfcLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [activeSection, isAuthenticated, nfcPage, nfcSearch, nfcStatus, nfcVersion]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated || activeSection !== 'drivers') return;
    let active = true;
    const timer = setTimeout(() => {
      setDriverDirectoryLoading(true);
      AsyncStorage.getItem(ADMIN_SESSION_KEY)
        .then((sessionToken) => {
          if (!sessionToken) throw new Error('Session absente');
          return getAdminDrivers({
            sessionToken,
            search: driverSearch,
            status: driverStatusFilter,
            zone: driverZoneFilter,
            page: driverPage,
          });
        })
        .then((result) => {
          if (active) setDriverDirectory(result || { drivers: [], stats: {}, pagination: { page: 1, total: 0, limit: 20 } });
        })
        .catch(() => {
          if (active) setDriverDirectory({ drivers: [], stats: {}, pagination: { page: 1, total: 0, limit: 20 } });
        })
        .finally(() => {
          if (active) setDriverDirectoryLoading(false);
        });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [activeSection, driverDirectoryVersion, driverPage, driverSearch, driverStatusFilter, driverZoneFilter, isAuthenticated]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated || activeSection !== 'agents') return;
    let active = true;
    const timer = setTimeout(() => {
      setAgentDirectoryLoading(true);
      AsyncStorage.getItem(ADMIN_SESSION_KEY)
        .then((sessionToken) => {
          if (!sessionToken) throw new Error('Session absente');
          return getAdminAgents({
            sessionToken,
            search: agentSearch,
            status: agentStatusFilter,
            zone: agentZoneFilter,
            agentRole: agentRoleFilter,
            manager: agentManagerFilter,
            page: agentPage,
          });
        })
        .then((result) => {
          if (active) setAgentDirectory(result || { agents: [], stats: {}, pagination: { page: 1, total: 0, limit: 20 } });
        })
        .catch(() => {
          if (active) setAgentDirectory({ agents: [], stats: {}, pagination: { page: 1, total: 0, limit: 20 } });
        })
        .finally(() => {
          if (active) setAgentDirectoryLoading(false);
        });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [activeSection, agentDirectoryVersion, agentManagerFilter, agentPage, agentRoleFilter, agentSearch, agentStatusFilter, agentZoneFilter, isAuthenticated]);

  const qrTransactions = notifications.filter((item) => item.type === 'qr').length;
  const nfcTransactions = notifications.filter((item) => item.type === 'nfc').length;
  const rechargeTransactions = notifications.filter((item) => item.type === 'recharge').length;
  const activeClient = selectedClient;

  const changeDriverStatus = async (driver: any, status: 'active' | 'pending' | 'suspended' | 'blocked' | 'refused' | 'closed') => {
    try {
      setDriverActionLoading(true);
      const sessionToken = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      if (!sessionToken) throw new Error('Session administrateur expirée');
      await updateDriverStatus(driver.id, sessionToken, status);
      setDriverDirectoryVersion((value) => value + 1);
      setSelectedDriver((current: any) => current?.id === driver.id ? { ...current, status } : current);
      Alert.alert('Chauffeur mis à jour', status === 'closed' ? 'Le chauffeur est retiré de la liste. Son historique est conservé.' : 'Le nouveau statut a été enregistré.');
      return true;
    } catch (error) {
      Alert.alert('Action impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
      return false;
    } finally {
      setDriverActionLoading(false);
    }
  };

  const saveDriver = async (driver: any) => {
    try {
      setDriverActionLoading(true);
      const sessionToken = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      if (!sessionToken) throw new Error('Session administrateur expirée');
      const result = await updateDriverByAdmin(driver.id, {
        sessionToken,
        fullName: driver.fullName || '',
        email: driver.email || '',
        phone: driver.phone || '',
        vehicle: driver.vehicle || '',
        busPlate: driver.busPlate || '',
        route: driver.route || '',
      });
      setSelectedDriver({ ...driver, ...(result?.driver || {}) });
      setDriverDirectoryVersion((value) => value + 1);
      setDriverPanelMode('view');
      Alert.alert('Modifications enregistrées', 'Le profil du chauffeur a été mis à jour.');
    } catch (error) {
      Alert.alert('Modification impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
    } finally {
      setDriverActionLoading(false);
    }
  };

  const changeAgentStatus = async (agent: any, status: 'active' | 'pending' | 'inactive' | 'blocked' | 'closed') => {
    try {
      setAgentActionLoading(true);
      const sessionToken = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      if (!sessionToken) throw new Error('Session administrateur expirée');
      await updateAgentStatus(agent.id, sessionToken, status);
      setAgentDirectoryVersion((value) => value + 1);
      setSelectedAgent((current: any) => current?.id === agent.id ? { ...current, status } : current);
      Alert.alert('Agent mis à jour', status === 'closed' ? 'L’agent est retiré de la liste. Son historique est conservé.' : 'Le nouveau statut a été enregistré.');
      return true;
    } catch (error) {
      Alert.alert('Action impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
      return false;
    } finally {
      setAgentActionLoading(false);
    }
  };

  const saveAgent = async (agent: any) => {
    try {
      setAgentActionLoading(true);
      const sessionToken = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      if (!sessionToken) throw new Error('Session administrateur expirée');
      const result = await updateAgentByAdmin(agent.id, {
        sessionToken,
        fullName: agent.fullName || '',
        email: agent.email || '',
        phone: agent.phone || '',
        assignmentZone: agent.assignmentZone || '',
        managerName: agent.managerName || '',
        agentRole: agent.agentRole || 'Agent terrain',
      });
      setSelectedAgent({ ...agent, ...(result?.agent || {}) });
      setAgentDirectoryVersion((value) => value + 1);
      setAgentPanelMode('view');
      Alert.alert('Modifications enregistrées', 'Le profil de l’agent a été mis à jour.');
    } catch (error) {
      Alert.alert('Modification impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
    } finally {
      setAgentActionLoading(false);
    }
  };

  const creditSelectedAgent = async () => {
    const amount = Number(agentCreditAmount.replace(/\s/g, ''));
    if (!agentCreditCandidate || !Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Montant invalide', 'Entrez un montant supérieur à zéro.');
      return;
    }
    try {
      setAgentActionLoading(true);
      const sessionToken = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      if (!sessionToken) throw new Error('Session administrateur expirée');
      const result = await rechargeAgent(agentCreditCandidate.id, amount, sessionToken);
      setAgentDirectoryVersion((value) => value + 1);
      setDashboardData((current: any) => current ? {
        ...current,
        collected: Number(current.collected || 0) + amount,
        agentBalance: Number(current.agentBalance || 0) + amount,
        availableBalance: Number(current.availableBalance || 0) + amount,
      } : current);
      setAgentCreditCandidate(null);
      setAgentCreditAmount('');
      Alert.alert('Crédit envoyé', `${amount.toLocaleString('fr-FR')} FC ajouté au compte de ${result?.agent?.fullName || agentCreditCandidate.fullName}.`);
    } catch (error) {
      Alert.alert('Crédit impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
    } finally {
      setAgentActionLoading(false);
    }
  };

  const logout = async () => {
    setSelectedClient(null);
    setClientId('');
    await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.sessionStorage.removeItem(LANGUAGE_KEY);
    }
    setLanguage('fr');
    clearSession();
    router.replace('/login' as any);
  };

  const openClientProfile = async (clientIdToOpen: string, mode: 'view' | 'edit') => {
    try {
      setClientActionLoading(true);
      const result = await findClientById(clientIdToOpen);
      if (!result?.client) {
        throw new Error('Client introuvable');
      }
      setSelectedClient(result.client);
      setClientId(clientIdToOpen);
      setClientPanelMode(mode);
    } catch (error) {
      Alert.alert('Profil indisponible', error instanceof Error ? error.message : 'Impossible de charger ce client.');
    } finally {
      setClientActionLoading(false);
    }
  };

  const changeClientStatus = async (client: any, status: 'active' | 'blocked' | 'closed') => {
    try {
      setClientActionLoading(true);
      const sessionToken = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      if (!sessionToken) {
        throw new Error('Session administrateur expirée');
      }
      await updateClientStatus(client.id, sessionToken, status);
      setClientDirectoryVersion((value) => value + 1);
      if (selectedClient?.id === client.id) {
        setSelectedClient((current: any) => current ? { ...current, status } : current);
      }
      Alert.alert('Compte mis à jour', status === 'closed' ? 'Le compte est fermé et son historique est conservé.' : status === 'blocked' ? 'Le compte est bloqué.' : 'Le compte est réactivé.');
      return true;
    } catch (error) {
      Alert.alert('Action impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
      return false;
    } finally {
      setClientActionLoading(false);
    }
  };

  const saveManagedCard = async () => {
    if (!cardManagerClient || !managedCardId.trim()) {
      Alert.alert('Carte obligatoire', 'Entrez ou scannez l’identifiant de la carte NFC.');
      return;
    }
    try {
      setClientActionLoading(true);
      await saveNfcCard(cardManagerClient.id, managedCardId.trim());
      setCardManagerClient((client: any) => ({ ...client, nfcCard: { cardId: managedCardId.trim(), blocked: false } }));
      setClientDirectoryVersion((value) => value + 1);
      Alert.alert('Carte associée', 'La carte NFC est maintenant associée à ce client.');
    } catch (error) {
      Alert.alert('Association impossible', error instanceof Error ? error.message : 'Cette carte est peut-être déjà utilisée.');
    } finally {
      setClientActionLoading(false);
    }
  };

  const toggleManagedCard = async () => {
    if (!cardManagerClient?.nfcCard) {
      return;
    }
    try {
      setClientActionLoading(true);
      const blocked = !cardManagerClient.nfcCard.blocked;
      await setNfcCardBlocked(cardManagerClient.id, blocked);
      setCardManagerClient((client: any) => ({ ...client, nfcCard: { ...client.nfcCard, blocked } }));
      setClientDirectoryVersion((value) => value + 1);
    } catch (error) {
      Alert.alert('Action impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
    } finally {
      setClientActionLoading(false);
    }
  };

  const enrollNfcCard = async () => {
    if (!nfcEnrollClientId.trim() || !nfcEnrollCardId.trim()) {
      Alert.alert('Informations obligatoires', 'Entrez l’identifiant du client et l’UID de la carte.');
      return;
    }
    try {
      setNfcActionLoading(true);
      const sessionToken = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      if (!sessionToken) throw new Error('Session administrateur expirée');
      await enrollAdminNfcCard(sessionToken, nfcEnrollClientId.trim(), nfcEnrollCardId.trim().toUpperCase());
      setNfcEnrollVisible(false);
      setNfcEnrollClientId('');
      setNfcEnrollCardId('');
      setNfcVersion((value) => value + 1);
      Alert.alert('Carte enrôlée', 'La carte NFC est maintenant associée au client.');
    } catch (error) {
      Alert.alert('Enrôlement impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
    } finally {
      setNfcActionLoading(false);
    }
  };

  const toggleNfcDirectoryCard = async (card: any) => {
    try {
      setNfcActionLoading(true);
      const sessionToken = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      if (!sessionToken) throw new Error('Session administrateur expirée');
      await updateAdminNfcCardStatus(sessionToken, card.cardId, !card.blocked);
      setNfcSelectedCard(null);
      setNfcVersion((value) => value + 1);
      Alert.alert('Carte mise à jour', card.blocked ? 'La carte est active.' : 'La carte est bloquée.');
    } catch (error) {
      Alert.alert('Action impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
    } finally {
      setNfcActionLoading(false);
    }
  };

  const findClient = async () => {
    const cleanClientId = clientId.trim();
    setClientFeedback(null);
    if (!cleanClientId) {
      const message = 'Entrez l’ID du client.';
      setSelectedClient(null);
      setClientFeedback({ type: 'error', message });
      Alert.alert('ID obligatoire', message);
      return;
    }

    try {
      setClientLookupLoading(true);
      const result = await findClientById(cleanClientId);
      if (!result?.client) {
        throw new Error('Client introuvable.');
      }

      setSelectedClient(result.client);
      setRechargeClientId(result.client.id || cleanClientId);
      setClientFeedback({ type: 'success', message: `Compte client trouvé : ${result.client.fullName || result.client.id}.` });
      setActiveSection('clients');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Aucun compte client trouvé avec cet ID.';
      setSelectedClient(null);
      setClientFeedback({ type: 'error', message });
      Alert.alert('Client introuvable', message);
    } finally {
      setClientLookupLoading(false);
    }
  };

  const updateSelectedClient = async (nextClient: { fullName: string; email: string; phone: string; birthDate: string }) => {
    if (!selectedClient?.id) {
      Alert.alert('Client introuvable', 'Sélectionnez d’abord un compte client.');
      return;
    }

    try {
      setClientUpdateLoading(true);
      const result = await updateClientByAdmin(selectedClient.id, nextClient);
      if (!result?.client) {
        throw new Error('Mise à jour non confirmée.');
      }

      setSelectedClient(result.client);
      setClientId(result.client.id);
      setRechargeClientId(result.client.id);
      setClientFeedback({ type: 'success', message: 'Données client mises à jour.' });
      Alert.alert('Mise à jour confirmée', 'Les informations du client ont été modifiées.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de modifier ce compte client.';
      setClientFeedback({ type: 'error', message });
      Alert.alert('Mise à jour impossible', message);
    } finally {
      setClientUpdateLoading(false);
    }
  };

  const getCardId = (tag: NfcTag) => tag?.id || tag?.type || '';

  const readAdminNfcCard = async () => {
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
        alertMessage: 'Approchez la carte du client',
      });
      const tag = await NfcManager.getTag();
      const nextCardId = getCardId(tag);

      if (!nextCardId) {
        Alert.alert('Carte non reconnue', "Impossible de lire l'identifiant NFC.");
        return;
      }

      setRechargeCardId(nextCardId);
      setRechargeClientId('');
      setRechargeFeedback({ type: 'success', message: 'Carte NFC lue. Ajoutez le montant puis confirmez.' });
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
      setPrepaidFeedback({ type: 'success', message: 'Carte NFC vierge lue. Entrez le numéro puis envoyez le code.' });
    } catch {
      Alert.alert('Lecture annulée', 'Aucune carte NFC lue.');
    } finally {
      setIsReadingPrepaidNfc(false);
      manager?.cancelTechnologyRequest?.().catch(() => {});
    }
  };

  const sendPrepaidCode = async () => {
    const cleanPhone = prepaidPhone.trim();
    setPrepaidFeedback(null);

    if (!cleanPhone) {
      const message = 'Entrez le numéro de téléphone du client.';
      setPrepaidFeedback({ type: 'error', message });
      Alert.alert('Téléphone obligatoire', message);
      return;
    }

    try {
      setPrepaidLoading(true);
      const result = await requestPrepaidCardCode(cleanPhone);
      setPrepaidFeedback({
        type: 'success',
        message: result?.code
          ? `Code généré : ${result.code}. Entrez-le pour confirmer le numéro.`
          : 'Code envoyé. Entrez le code reçu pour confirmer le numéro.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible d’envoyer le code.';
      setPrepaidFeedback({ type: 'error', message });
      Alert.alert('Code non envoyé', message);
    } finally {
      setPrepaidLoading(false);
    }
  };

  const confirmPrepaidCard = async () => {
    const cleanPhone = prepaidPhone.trim();
    const cleanCode = prepaidCode.trim();
    const cleanCardId = prepaidCardId.trim();
    setPrepaidFeedback(null);

    if (!cleanPhone || !cleanCode || !cleanCardId) {
      const message = 'Lisez la carte NFC, entrez le téléphone et le code reçu.';
      setPrepaidFeedback({ type: 'error', message });
      Alert.alert('Informations obligatoires', message);
      return;
    }

    try {
      setPrepaidLoading(true);
      const result = await activatePrepaidCard({
        phone: cleanPhone,
        code: cleanCode,
        cardId: cleanCardId,
        operatorId: currentUser?.id || 'ADMIN',
      });

      setSelectedClient(result.client);
      setClientId(result.client.id);
      setRechargeClientId(result.client.id);
      setPrepaidCode('');
      setPrepaidCardId('');
      setPrepaidFeedback({ type: 'success', message: `Carte activée pour le compte ${result.client.id}.` });
      Alert.alert('Carte activée', `Carte prépayée associée au compte ${result.client.id}.`);
      setActiveSection('clients');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible d’activer cette carte.';
      setPrepaidFeedback({ type: 'error', message });
      Alert.alert('Activation impossible', message);
    } finally {
      setPrepaidLoading(false);
    }
  };

  const confirmInternalRecharge = async () => {
    const cleanClientId = rechargeClientId.trim();
    const cleanCardId = rechargeCardId.trim();
    const value = Number.parseInt(rechargeAmount, 10);
    setRechargeFeedback(null);

    if ((!cleanClientId && !cleanCardId) || !Number.isFinite(value) || value <= 0) {
      const message = 'Entrez l’ID du client, scannez la carte NFC, puis ajoutez le montant.';
      setRechargeFeedback({ type: 'error', message });
      Alert.alert('Informations obligatoires', message);
      return;
    }

    try {
      setRechargeLoading(true);
      const result = await createInternalRecharge({
        clientId: cleanClientId || undefined,
        cardId: cleanCardId || undefined,
        amount: value,
        agentId: 'ADMIN',
      });

      if (!result?.client) {
        throw new Error('Recharge non confirmée. Vérifiez l’ID du client.');
      }

      setSelectedClient(result.client);
      setClientId(result.client.id || cleanClientId);
      setRechargeClientId(result.client.id || cleanClientId);
      setClientFeedback({ type: 'success', message: `Compte client trouvé : ${result.client.fullName || result.client.id}.` });

      setRechargeAmount('');
      setRechargeCardId('');
      setRechargeFeedback({ type: 'success', message: `Recharge confirmée : ${value} FC ajouté au compte ${result.client.id || cleanClientId}.` });
      Alert.alert('Recharge confirmée', `${value} FC ajouté au compte ${result.client.id || cleanClientId}.`);
      setActiveSection('clients');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Vérifiez l’ID du client.';
      setRechargeFeedback({ type: 'error', message });
      Alert.alert('Recharge impossible', message);
    } finally {
      setRechargeLoading(false);
    }
  };

  const confirmAgentRecharge = async () => {
    const cleanAgentId = agentRechargeId.trim();
    const value = Number.parseInt(agentRechargeAmount, 10);
    setAgentFeedback(null);

    if (!cleanAgentId || !Number.isFinite(value) || value <= 0) {
      const message = 'Entrez l’ID de l’agent et le montant à lui envoyer.';
      setAgentFeedback({ type: 'error', message });
      Alert.alert('Informations obligatoires', message);
      return;
    }

    try {
      setAgentRechargeLoading(true);
      const sessionToken = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      if (!sessionToken) throw new Error('Session administrateur expirée');
      const result = await rechargeAgent(cleanAgentId, value, sessionToken);
      if (!result?.agent) {
        throw new Error('Agent actif introuvable. Vérifiez l’ID agent.');
      }
      setAgentRechargeAmount('');
      if (result?.agent) {
        setTrackedAgent(result.agent);
        setTrackedAgentStats(null);
      }
      setAgentFeedback({
        type: 'success',
        message: `Crédit envoyé : ${value} FC au compte agent ${result.agent.id}. Solde : ${result.agent.balance} FC.`,
      });
      Alert.alert(
        'Crédit envoyé',
        `${value} FC envoyé au compte agent ${result.agent.id}. Solde : ${result.agent.balance} FC.`
      );
      setActiveSection('agents');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Vérifiez l’ID de l’agent.';
      setAgentFeedback({ type: 'error', message });
      Alert.alert('Recharge agent impossible', message);
    } finally {
      setAgentRechargeLoading(false);
    }
  };

  const findAgentAccount = async () => {
    const cleanAgentId = agentRechargeId.trim();
    setAgentFeedback(null);

    if (!cleanAgentId) {
      const message = 'Entrez l’ID de l’agent à suivre.';
      setAgentFeedback({ type: 'error', message });
      Alert.alert('ID obligatoire', message);
      return;
    }

    try {
      setAgentLookupLoading(true);
      const result = await getAgentAccount(cleanAgentId);
      if (!result?.agent) {
        throw new Error('Compte agent introuvable.');
      }
      setTrackedAgent(result?.agent || null);
      setTrackedAgentStats(result?.stats || null);
      setAgentFeedback({ type: 'success', message: `Compte agent trouvé : ${result.agent.fullName || result.agent.id}.` });
      setActiveSection('agents');
    } catch (error) {
      setTrackedAgent(null);
      setTrackedAgentStats(null);
      const message = error instanceof Error ? error.message : 'Vérifiez l’ID de l’agent.';
      setAgentFeedback({ type: 'error', message });
      Alert.alert('Compte agent introuvable', message);
    } finally {
      setAgentLookupLoading(false);
    }
  };

  const refreshPage = () => {
    setRefreshing(true);
    loadPendingUsers().finally(() => setRefreshing(false));
  };

  const approvePendingUser = async (userId: string) => {
    try {
      setApprovingUserId(userId);
      const result = await approveUser(userId);
      Alert.alert('Compte validé', `${result?.user?.fullName || 'Le compte'} peut maintenant se connecter.`);
      await loadPendingUsers();
    } catch (error) {
      Alert.alert('Validation impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
    } finally {
      setApprovingUserId(null);
    }
  };

  if (checkingAdminSession) {
    return (
      <View style={[styles.page, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={TAKO_BLUE} />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={[styles.shell, isNarrow && styles.mobileShell]}>
        <View style={[styles.sidebar, isNarrow && styles.mobileSidebar]}>
          <View style={styles.brandBlock}>
            <TakoLogo size="login" color="white" />
          </View>

          <ScrollView
            style={!isNarrow ? styles.navScroller : undefined}
            contentContainerStyle={[styles.navList, isNarrow && styles.mobileNavList]}
            showsVerticalScrollIndicator={false}>
            {navItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.navItem, isNarrow && styles.mobileNavItem, activeSection === item.key && styles.navItemActive]}
                activeOpacity={0.82}
                onPress={() => setActiveSection(item.key)}>
                <Ionicons name={item.icon} size={22} color={activeSection === item.key ? TAKO_BLUE : 'white'} />
                <Text style={[styles.navText, activeSection === item.key && styles.navTextActive]}>{adminNavTranslations[language][item.key]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={[styles.sidebarLogout, isNarrow && styles.mobileSidebarLogout]} activeOpacity={0.85} onPress={logout}>
            <Ionicons name="log-out-outline" size={22} color="white" />
            <Text style={styles.sidebarLogoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={[styles.contentScroller, WEB_SCROLLBAR_STYLE]}
          contentContainerStyle={[styles.content, isNarrow && styles.mobileContent]}
          showsVerticalScrollIndicator
          persistentScrollbar
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshPage} tintColor={TAKO_BLUE} colors={[TAKO_BLUE]} />
          }>
          <View style={[styles.topBar, isNarrow && styles.mobileTopBar]}>
            <View>
              <Text style={styles.kicker}>Administration TaKo</Text>
              <Text style={styles.title}>{adminNavTranslations[language][activeSection]}</Text>
              <Text style={styles.subtitle}>
                {activeSection === 'dashboard' ? 'Vue générale de l’activité TaKo.' : activeSection === 'profile' ? 'Consultez et gérez vos informations personnelles.' : 'Gestion et suivi des opérations.'}
              </Text>
            </View>

            <View style={[styles.topActions, isNarrow && styles.mobileTopActions]}>
              <TouchableOpacity style={styles.adminBadge} activeOpacity={0.82} onPress={() => setIsAdminMenuOpen((open) => !open)}>
                <View style={styles.adminAvatar}><Ionicons name="person" size={24} color="white" /></View>
                <View>
                  <Text style={styles.adminName}>Admin TaKo</Text>
                  <Text style={styles.adminEmail}>Super administrateur</Text>
                </View>
                <Ionicons name={isAdminMenuOpen ? 'chevron-up' : 'chevron-down'} size={18} color={TAKO_BLUE} />
              </TouchableOpacity>

              {isAdminMenuOpen ? (
                <View style={styles.adminMenu}>
                  <TouchableOpacity style={styles.adminMenuItem} onPress={() => { setActiveSection('profile'); setIsAdminMenuOpen(false); }}><Ionicons name="person-outline" size={19} color={TAKO_BLUE} /><Text style={styles.adminMenuText}>Mon profil</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.adminMenuItem} onPress={() => { setActiveSection('settings'); setIsAdminMenuOpen(false); }}><Ionicons name="key-outline" size={19} color={TAKO_BLUE} /><Text style={styles.adminMenuText}>Changer le mot de passe</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.adminMenuItem} onPress={() => { setActiveSection('audit'); setIsAdminMenuOpen(false); }}><Ionicons name="time-outline" size={19} color={TAKO_BLUE} /><Text style={styles.adminMenuText}>Journal d’activité</Text></TouchableOpacity>
                  <View style={styles.adminMenuDivider} />
                  <TouchableOpacity style={styles.adminMenuItem} onPress={logout}><Ionicons name="log-out-outline" size={19} color="#D64545" /><Text style={styles.adminMenuLogout}>Se déconnecter</Text></TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>

          {activeSection === 'dashboard' ? (
            <>
              <View style={styles.dashboardToolbar}>
                <View>
                  <Text style={styles.cardText}>Vue d’ensemble de l’activité de TaKo</Text>
                </View>
              </View>

              {dashboardLoading ? (
                <ActivityIndicator size="large" color={TAKO_BLUE} style={styles.dashboardLoader} />
              ) : (
                <View style={[styles.statsGrid, isNarrow && styles.mobileStatsGrid]}>
                  <StatCard icon="people-outline" label="Clients" value={`${dashboardData?.clients ?? 0}`} tone="blue" change={dashboardData?.changes?.clients} comparison={dashboardData?.comparisonLabel} />
                  <StatCard icon="bus-outline" label="Chauffeurs" value={`${dashboardData?.drivers ?? 0}`} tone="green" change={dashboardData?.changes?.drivers} comparison={dashboardData?.comparisonLabel} />
                  <StatCard icon="person-add-outline" label="Agents" value={`${dashboardData?.agents ?? 0}`} tone="blue" change={dashboardData?.changes?.agents} comparison={dashboardData?.comparisonLabel} />
                  <StatCard icon="swap-horizontal-outline" label="Transactions (période)" value={`${dashboardData?.transactions ?? 0}`} tone="blue" change={dashboardData?.changes?.transactions} comparison={dashboardData?.comparisonLabel} />
                  <StatCard icon="cash-outline" label="Argent agent" value={`${dashboardData?.agentBalance ?? 0} FC`} tone="green" />
                  <StatCard icon="car-outline" label="À verser aux chauffeurs" value={`${dashboardData?.driverAmount ?? 0} FC`} tone="blue" change={dashboardData?.changes?.driverAmount} comparison={dashboardData?.comparisonLabel} />
                  <StatCard icon="trending-up-outline" label="Commission TaKo" value={`${dashboardData?.commission ?? 0} FC`} tone="green" change={dashboardData?.changes?.commission} comparison={dashboardData?.comparisonLabel} />
                  <StatCard icon="checkmark-circle-outline" label="Recharges réussies" value={`${dashboardData?.recharges?.successful ?? 0}`} tone="green" change={dashboardData?.changes?.recharges} comparison={dashboardData?.comparisonLabel} />
                  <StatCard icon="checkmark-done-outline" label="Versements réussis" value={`${dashboardData?.payouts?.successful ?? 0}`} tone="blue" change={dashboardData?.changes?.payouts} comparison={dashboardData?.comparisonLabel} />
                  <StatCard icon="wallet-outline" label="Solde disponible total" value={`${dashboardData?.availableBalance ?? 0} FC`} tone="green" change={dashboardData?.changes?.balance} comparison={dashboardData?.comparisonLabel} />
                </View>
              )}

              <View style={styles.dashboardCharts}>
                <View style={[styles.card, styles.dashboardChartWide]}>
                  <Text style={styles.cardTitle}>Évolution des transactions</Text>
                  <View style={styles.lineChart}>
                    {[28, 52, 40, 64, 46, 72, 58, 91].map((height, index) => (
                      <View key={index} style={[styles.linePoint, { marginTop: 100 - height }]} />
                    ))}
                  </View>
                </View>
                <View style={[styles.card, styles.dashboardChartCard]}>
                  <Text style={styles.cardTitle}>Répartition des transactions</Text>
                  <View style={styles.donutChart}>
                    <View style={styles.donutCenter}><Text style={styles.donutValue}>{dashboardData?.transactions ?? 0}</Text></View>
                  </View>
                  <View style={styles.chartLegend}>
                    <Text style={styles.legendBlue}>● QR</Text>
                    <Text style={styles.legendGreen}>● NFC</Text>
                    <Text style={styles.legendOrange}>● Recharge</Text>
                  </View>
                </View>
                <View style={[styles.card, styles.dashboardActivityCard]}>
                  <Text style={styles.cardTitle}>Activité en temps réel</Text>
                  {notifications.length ? notifications.slice(0, 5).map((item) => (
                    <View key={item.id} style={styles.activityRow}>
                      <View style={styles.activityIcon}><Ionicons name="flash-outline" size={15} color={TAKO_ACTION} /></View>
                      <View style={styles.activityBody}>
                        <Text style={styles.activityMessage} numberOfLines={1}>{item.message}</Text>
                        <Text style={styles.activityDate}>{formatDate(item.createdAt)}</Text>
                      </View>
                    </View>
                  )) : <Text style={styles.cardText}>Aucune activité récente.</Text>}
                </View>
              </View>

              <View style={styles.dashboardRecentGrid}>
                <DashboardRecentTable
                  title="Dernières recharges"
                  headers={['Client', 'Montant', 'Type', 'Statut', 'Date']}
                  items={notifications.filter((item) => item.type === 'recharge').slice(0, 5)}
                />
                <DashboardRecentTable
                  title="Derniers versements"
                  headers={['Chauffeur', 'Montant', 'Type', 'Statut', 'Date']}
                  items={[]}
                />
              </View>
            </>
          ) : null}

          {activeSection === 'clients' ? (
            <>
              <ClientDirectoryScreen
                directory={clientDirectory}
                loading={clientDirectoryLoading}
                search={clientSearch}
                setSearch={(value) => { setClientSearch(value); setClientPage(1); }}
                status={clientStatusFilter}
                setStatus={(value) => { setClientStatusFilter(value); setClientPage(1); }}
                cardFilter={clientCardFilter}
                setCardFilter={(value) => { setClientCardFilter(value); setClientPage(1); }}
                page={clientPage}
                setPage={setClientPage}
                addClient={() => router.push('/register' as any)}
                viewClient={(client) => openClientProfile(client.id, 'view')}
                editClient={(client) => openClientProfile(client.id, 'edit')}
                manageCard={(client) => {
                  setCardManagerClient(client);
                  setManagedCardId(client.nfcCard?.cardId || '');
                }}
                closeClient={setDeleteCandidate}
                actionLoading={clientActionLoading}
              />
              <Modal visible={!!deleteCandidate} transparent animationType="fade" onRequestClose={() => setDeleteCandidate(null)}>
                <View style={styles.modalBackdrop}>
                  <View style={styles.confirmModal}>
                    <View style={styles.confirmIcon}>
                      <Ionicons name="trash-outline" size={30} color="#DC2626" />
                    </View>
                    <Text style={styles.confirmTitle}>Confirmer la suppression</Text>
                    <Text style={styles.confirmText}>
                      Voulez-vous supprimer le client {deleteCandidate?.fullName} de la liste ? Son historique financier sera conservé.
                    </Text>
                    <View style={styles.confirmActions}>
                      <TouchableOpacity style={styles.confirmNo} disabled={clientActionLoading} onPress={() => setDeleteCandidate(null)}>
                        <Text style={styles.confirmNoText}>Non</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.confirmYes}
                        disabled={clientActionLoading}
                        onPress={async () => {
                          const deleted = await changeClientStatus(deleteCandidate, 'closed');
                          if (deleted) {
                            setDeleteCandidate(null);
                          }
                        }}>
                        {clientActionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmYesText}>Oui, supprimer</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
              <Modal visible={!!cardManagerClient} transparent animationType="fade" onRequestClose={() => setCardManagerClient(null)}>
                <View style={styles.modalBackdrop}>
                  <View style={[styles.card, styles.modalCard]}>
                    <View style={styles.referenceHeader}>
                      <View>
                        <Text style={styles.cardTitle}>Carte NFC — {cardManagerClient?.fullName}</Text>
                        <Text style={styles.cardText}>Une carte ne peut être associée qu’à un seul client.</Text>
                      </View>
                      <TouchableOpacity onPress={() => setCardManagerClient(null)}><Ionicons name="close" size={24} color={TAKO_BLUE} /></TouchableOpacity>
                    </View>
                    <View style={styles.cardManagerRow}>
                      <TextInput
                        value={managedCardId}
                        onChangeText={setManagedCardId}
                        placeholder="UID ou numéro de série NFC"
                        placeholderTextColor="#94A3B8"
                        style={styles.cardManagerInput}
                      />
                      <TouchableOpacity style={styles.referencePrimary} disabled={clientActionLoading} onPress={saveManagedCard}>
                        <Text style={styles.referencePrimaryText}>Associer la carte</Text>
                      </TouchableOpacity>
                      {cardManagerClient?.nfcCard ? (
                        <TouchableOpacity style={styles.secondaryAction} disabled={clientActionLoading} onPress={toggleManagedCard}>
                          <Text style={styles.secondaryActionText}>{cardManagerClient.nfcCard.blocked ? 'Réactiver la carte' : 'Suspendre la carte'}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
              </Modal>
              <Modal visible={!!activeClient && !!clientPanelMode} transparent animationType="fade" onRequestClose={() => setClientPanelMode(null)}>
                <View style={styles.modalBackdrop}>
                  <View style={styles.profileModalCard}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.referenceTitle}>{clientPanelMode === 'edit' ? 'Modifier le client' : 'Profil client'}</Text>
                      <TouchableOpacity onPress={() => setClientPanelMode(null)}><Ionicons name="close" size={26} color={TAKO_BLUE} /></TouchableOpacity>
                    </View>
                    <ScrollView style={styles.profileModalScroll}>
                      <ClientDetails
                        client={activeClient}
                        balance={Number(activeClient?.balance || 0)}
                        trips={trips.length}
                        notifications={notifications.length}
                        updating={clientUpdateLoading}
                        updateClient={updateSelectedClient}
                      />
                    </ScrollView>
                  </View>
                </View>
              </Modal>
            </>
          ) : null}

          {activeSection === 'drivers' ? (
            <>
              <DriverDirectoryScreen
                directory={driverDirectory}
                loading={driverDirectoryLoading}
                search={driverSearch}
                setSearch={(value) => { setDriverSearch(value); setDriverPage(1); }}
                status={driverStatusFilter}
                setStatus={(value) => { setDriverStatusFilter(value); setDriverPage(1); }}
                zone={driverZoneFilter}
                setZone={(value) => { setDriverZoneFilter(value); setDriverPage(1); }}
                page={driverPage}
                setPage={setDriverPage}
                addDriver={() => router.push('/register' as any)}
                viewDriver={(driver) => { setSelectedDriver(driver); setDriverPanelMode('view'); }}
                editDriver={(driver) => { setSelectedDriver({ ...driver }); setDriverPanelMode('edit'); }}
                closeDriver={setDriverDeleteCandidate}
                actionLoading={driverActionLoading}
              />
              <Modal visible={!!driverDeleteCandidate} transparent animationType="fade" onRequestClose={() => setDriverDeleteCandidate(null)}>
                <View style={styles.modalBackdrop}>
                  <View style={styles.confirmModal}>
                    <View style={styles.confirmIcon}><Ionicons name="trash-outline" size={30} color="#DC2626" /></View>
                    <Text style={styles.confirmTitle}>Confirmer la suppression</Text>
                    <Text style={styles.confirmText}>Voulez-vous supprimer le chauffeur {driverDeleteCandidate?.fullName} de la liste ? Son historique financier sera conservé.</Text>
                    <View style={styles.confirmActions}>
                      <TouchableOpacity style={styles.confirmNo} disabled={driverActionLoading} onPress={() => setDriverDeleteCandidate(null)}><Text style={styles.confirmNoText}>Non</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.confirmYes} disabled={driverActionLoading} onPress={async () => {
                        const deleted = await changeDriverStatus(driverDeleteCandidate, 'closed');
                        if (deleted) setDriverDeleteCandidate(null);
                      }}>
                        {driverActionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmYesText}>Oui, supprimer</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
              <Modal visible={!!selectedDriver && !!driverPanelMode} transparent animationType="fade" onRequestClose={() => setDriverPanelMode(null)}>
                <View style={styles.modalBackdrop}>
                  <View style={styles.profileModalCard}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.referenceTitle}>{driverPanelMode === 'edit' ? 'Modifier le chauffeur' : 'Profil chauffeur'}</Text>
                      <TouchableOpacity onPress={() => setDriverPanelMode(null)}><Ionicons name="close" size={26} color={TAKO_BLUE} /></TouchableOpacity>
                    </View>
                    <ScrollView style={styles.profileModalScroll}>
                      <DriverDetails
                        driver={selectedDriver}
                        editing={driverPanelMode === 'edit'}
                        setDriver={setSelectedDriver}
                        loading={driverActionLoading}
                        save={() => saveDriver(selectedDriver)}
                        changeStatus={(status) => changeDriverStatus(selectedDriver, status)}
                      />
                    </ScrollView>
                  </View>
                </View>
              </Modal>
            </>
          ) : null}

          {activeSection === 'agents' ? (
            <>
              <AgentDirectoryScreen
                directory={agentDirectory}
                loading={agentDirectoryLoading}
                search={agentSearch}
                setSearch={(value) => { setAgentSearch(value); setAgentPage(1); }}
                status={agentStatusFilter}
                setStatus={(value) => { setAgentStatusFilter(value); setAgentPage(1); }}
                zone={agentZoneFilter}
                setZone={(value) => { setAgentZoneFilter(value); setAgentPage(1); }}
                agentRole={agentRoleFilter}
                setAgentRole={(value) => { setAgentRoleFilter(value); setAgentPage(1); }}
                manager={agentManagerFilter}
                setManager={(value) => { setAgentManagerFilter(value); setAgentPage(1); }}
                page={agentPage}
                setPage={setAgentPage}
                addAgent={() => router.push('/register' as any)}
                viewAgent={(agent) => { setSelectedAgent(agent); setAgentPanelMode('view'); }}
                editAgent={(agent) => { setSelectedAgent({ ...agent }); setAgentPanelMode('edit'); }}
                creditAgent={(agent) => { setAgentCreditCandidate(agent); setAgentCreditAmount(''); }}
                closeAgent={setAgentDeleteCandidate}
                actionLoading={agentActionLoading}
              />
              <Modal visible={!!agentCreditCandidate} transparent animationType="fade" onRequestClose={() => setAgentCreditCandidate(null)}>
                <View style={styles.modalBackdrop}><View style={styles.confirmModal}>
                  <View style={[styles.confirmIcon, styles.creditIcon]}><Ionicons name="cash-outline" size={30} color="#087B35" /></View>
                  <Text style={styles.confirmTitle}>Créditer l’agent</Text>
                  <Text style={styles.confirmText}>Ajoutez de l’argent au compte de {agentCreditCandidate?.fullName}.</Text>
                  <TextInput
                    value={agentCreditAmount}
                    onChangeText={setAgentCreditAmount}
                    keyboardType="number-pad"
                    placeholder="Montant en FC"
                    placeholderTextColor="#94A3B8"
                    style={styles.creditAmountInput}
                  />
                  <View style={styles.confirmActions}>
                    <TouchableOpacity style={styles.confirmNo} disabled={agentActionLoading} onPress={() => setAgentCreditCandidate(null)}><Text style={styles.confirmNoText}>Annuler</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.creditConfirmButton} disabled={agentActionLoading} onPress={creditSelectedAgent}>{agentActionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmYesText}>Confirmer le crédit</Text>}</TouchableOpacity>
                  </View>
                </View></View>
              </Modal>
              <Modal visible={!!agentDeleteCandidate} transparent animationType="fade" onRequestClose={() => setAgentDeleteCandidate(null)}>
                <View style={styles.modalBackdrop}><View style={styles.confirmModal}>
                  <View style={styles.confirmIcon}><Ionicons name="trash-outline" size={30} color="#DC2626" /></View>
                  <Text style={styles.confirmTitle}>Confirmer la suppression</Text>
                  <Text style={styles.confirmText}>Voulez-vous supprimer l’agent {agentDeleteCandidate?.fullName} de la liste ? Son historique sera conservé.</Text>
                  <View style={styles.confirmActions}>
                    <TouchableOpacity style={styles.confirmNo} disabled={agentActionLoading} onPress={() => setAgentDeleteCandidate(null)}><Text style={styles.confirmNoText}>Non</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.confirmYes} disabled={agentActionLoading} onPress={async () => {
                      const deleted = await changeAgentStatus(agentDeleteCandidate, 'closed');
                      if (deleted) setAgentDeleteCandidate(null);
                    }}>{agentActionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmYesText}>Oui, supprimer</Text>}</TouchableOpacity>
                  </View>
                </View></View>
              </Modal>
              <Modal visible={!!selectedAgent && !!agentPanelMode} transparent animationType="fade" onRequestClose={() => setAgentPanelMode(null)}>
                <View style={styles.modalBackdrop}><View style={styles.profileModalCard}>
                  <View style={styles.modalHeader}><Text style={styles.referenceTitle}>{agentPanelMode === 'edit' ? 'Modifier l’agent' : 'Profil agent'}</Text><TouchableOpacity onPress={() => setAgentPanelMode(null)}><Ionicons name="close" size={26} color={TAKO_BLUE} /></TouchableOpacity></View>
                  <ScrollView style={styles.profileModalScroll}><AgentDetails agent={selectedAgent} editing={agentPanelMode === 'edit'} setAgent={setSelectedAgent} loading={agentActionLoading} save={() => saveAgent(selectedAgent)} changeStatus={(status) => changeAgentStatus(selectedAgent, status)} /></ScrollView>
                </View></View>
              </Modal>
            </>
          ) : null}

          {activeSection === 'transactions' ? (
            <View style={[styles.grid, isNarrow && styles.mobileGrid]}>
              <TransactionSummary qr={qrTransactions} nfc={nfcTransactions} recharge={rechargeTransactions} />
              <View style={[styles.card, styles.fullCard]}>
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.cardTitle}>Activité récente</Text>
                    <Text style={styles.cardText}>Dernières opérations connues par l’application.</Text>
                  </View>
                  <View style={styles.clientPill}>
                    <Text style={styles.clientPillText}>{notifications.length} lignes</Text>
                  </View>
                </View>

                {notifications.length === 0 ? (
                  <EmptyState icon="receipt-outline" title="Aucune transaction récente" text="Les paiements QR, NFC et recharges apparaîtront ici." />
                ) : (
                  notifications.slice(0, 8).map((item) => <TransactionRow key={item.id} item={item} />)
                )}
              </View>
            </View>
          ) : null}

          {activeSection === 'settings' ? (
            <View style={[styles.grid, isNarrow && styles.mobileGrid]}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Sécurité</Text>
                <ChecklistItem label="Web non public pour les clients" done />
                <ChecklistItem label="Accès administrateur par email fixe" done />
                <ChecklistItem label="ID client permanent non modifiable" done />
                <ChecklistItem label="Recherche client par ID" done />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Services paiement</Text>
                <ChecklistItem label="QR code transport" done />
                <ChecklistItem label="Carte NFC client" done />
                <ChecklistItem label="M-Pesa, Airtel Money, Orange Money" done />
                <ChecklistItem label="Notifications transaction" done />
              </View>
            </View>
          ) : null}

          {activeSection === 'news' ? <AdminNewsManager /> : null}

          {activeSection === 'profile' ? <AdminProfile user={currentUser} onOpenSecurity={() => setActiveSection('settings')} /> : null}

          {activeSection === 'nfcCards' ? (
            <>
              <NfcCardsScreen
                directory={nfcDirectory}
                loading={nfcLoading}
                search={nfcSearch}
                setSearch={(value) => { setNfcSearch(value); setNfcPage(1); }}
                status={nfcStatus}
                setStatus={(value) => { setNfcStatus(value); setNfcPage(1); }}
                page={nfcPage}
                setPage={setNfcPage}
                enroll={() => setNfcEnrollVisible(true)}
                viewCard={setNfcSelectedCard}
                toggleCard={toggleNfcDirectoryCard}
                actionLoading={nfcActionLoading}
              />
              <Modal visible={nfcEnrollVisible} transparent animationType="fade" onRequestClose={() => setNfcEnrollVisible(false)}>
                <View style={styles.modalBackdrop}>
                  <View style={styles.confirmModal}>
                    <Ionicons name="card-outline" size={38} color={TAKO_BLUE} />
                    <Text style={styles.confirmTitle}>Enrôler une carte NFC</Text>
                    <Text style={styles.confirmText}>Associez une carte à un client avec son identifiant et son UID NFC.</Text>
                    <TextInput value={nfcEnrollClientId} onChangeText={setNfcEnrollClientId} placeholder="Identifiant du client" style={styles.modalInput} autoCapitalize="none" />
                    <TextInput value={nfcEnrollCardId} onChangeText={setNfcEnrollCardId} placeholder="UID de la carte (ex. EB7E61BD)" style={styles.modalInput} autoCapitalize="characters" />
                    <View style={styles.confirmActions}>
                      <TouchableOpacity style={styles.confirmNo} onPress={() => setNfcEnrollVisible(false)}><Text style={styles.confirmNoText}>Annuler</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.confirmYes, { backgroundColor: TAKO_BLUE }]} disabled={nfcActionLoading} onPress={enrollNfcCard}><Text style={styles.confirmYesText}>{nfcActionLoading ? 'Enregistrement…' : 'Enrôler la carte'}</Text></TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
              <Modal visible={Boolean(nfcSelectedCard)} transparent animationType="fade" onRequestClose={() => setNfcSelectedCard(null)}>
                <View style={styles.modalBackdrop}>
                  <View style={styles.confirmModal}>
                    <Image source={require('../assets/images/client-physical-card.png')} style={{ width: 230, height: 145, borderRadius: 14 }} resizeMode="cover" />
                    <Text style={styles.confirmTitle}>{nfcSelectedCard?.cardId}</Text>
                    <Text style={styles.confirmText}>{nfcSelectedCard?.clientName || 'Client non renseigné'} · {nfcSelectedCard?.clientPhone || 'Téléphone indisponible'}</Text>
                    <Text style={styles.confirmText}>Solde : {Number(nfcSelectedCard?.balance || 0).toLocaleString('fr-FR')} FC</Text>
                    <View style={styles.confirmActions}>
                      <TouchableOpacity style={styles.confirmNo} onPress={() => setNfcSelectedCard(null)}><Text style={styles.confirmNoText}>Fermer</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.confirmYes, nfcSelectedCard?.blocked && { backgroundColor: '#087B35' }]} disabled={nfcActionLoading} onPress={() => toggleNfcDirectoryCard(nfcSelectedCard)}><Text style={styles.confirmYesText}>{nfcSelectedCard?.blocked ? 'Débloquer la carte' : 'Bloquer la carte'}</Text></TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </>
          ) : null}

          {activeSection !== 'nfcCards' && moduleContent[activeSection] ? <AdminModuleSection module={moduleContent[activeSection]!} dashboard={dashboardData} /> : null}
        </ScrollView>
      </View>
    </View>
  );
}

function NfcCardsScreen({
  directory, loading, search, setSearch, status, setStatus, page, setPage,
  enroll, viewCard, toggleCard, actionLoading,
}: {
  directory: any; loading: boolean; search: string; setSearch: (value: string) => void;
  status: string; setStatus: (value: string) => void; page: number; setPage: (value: number) => void;
  enroll: () => void; viewCard: (card: any) => void; toggleCard: (card: any) => void; actionLoading: boolean;
}) {
  const stats = directory?.stats || {};
  const cards = directory?.cards || [];
  const pagination = directory?.pagination || { total: 0, limit: 20 };
  const totalPages = Math.max(1, Math.ceil(Number(pagination.total || 0) / Number(pagination.limit || 20)));
  const money = (value: any) => `${Number(value || 0).toLocaleString('fr-FR')} FC`;
  const cardStats = [
    { icon: 'card-outline', label: 'Total cartes', value: Number(stats.total || 0).toLocaleString('fr-FR'), note: 'Toutes les cartes', color: TAKO_BLUE },
    { icon: 'checkmark-circle-outline', label: 'Cartes actives', value: Number(stats.active || 0).toLocaleString('fr-FR'), note: stats.total ? `${Math.round((stats.active / stats.total) * 1000) / 10}% du total` : '0% du total', color: '#0A9D50' },
    { icon: 'lock-closed-outline', label: 'Cartes bloquées', value: Number(stats.blocked || 0).toLocaleString('fr-FR'), note: stats.total ? `${Math.round((stats.blocked / stats.total) * 1000) / 10}% du total` : '0% du total', color: '#E97912' },
    { icon: 'close-circle-outline', label: 'Cartes expirées', value: Number(stats.expired || 0).toLocaleString('fr-FR'), note: 'Aucune expiration configurée', color: '#8B35DB' },
    { icon: 'server-outline', label: 'Solde total', value: money(stats.balance), note: 'Sur toutes les cartes', color: '#155DEB' },
  ];
  return (
    <View style={styles.clientDirectory}>
      <View style={styles.referenceHeader}>
        <View style={[styles.driverDetailActions, { marginLeft: 'auto' }]}>
          <View style={styles.secondaryAction}><Ionicons name="filter-outline" size={18} color={TAKO_BLUE} /><Text style={styles.secondaryActionText}>Filtres</Text></View>
          <TouchableOpacity style={styles.referencePrimary} onPress={enroll}><Ionicons name="add-outline" size={19} color="white" /><Text style={styles.referencePrimaryText}>Enrôler une carte</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.clientStats}>
        {cardStats.map((item) => (
          <View key={item.label} style={styles.clientStat}>
            <View style={styles.clientStatIcon}><Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={25} color={item.color} /></View>
            <View><Text style={styles.clientStatLabel}>{item.label}</Text><Text style={styles.clientStatValue}>{item.value}</Text><Text style={styles.clientSubtext}>{item.note}</Text></View>
          </View>
        ))}
      </View>

      <View style={styles.clientFilters}>
        <View style={styles.clientSearchBox}><Ionicons name="search-outline" size={18} color="#64748B" /><TextInput value={search} onChangeText={setSearch} placeholder="Rechercher une carte, UID, client…" placeholderTextColor="#94A3B8" style={styles.clientSearchInput} /></View>
        <View style={styles.filterChoices}>
          {[["", 'Tous'], ['active', 'Actives'], ['blocked', 'Bloquées']].map(([value, label]) => (
            <TouchableOpacity key={label} style={[styles.filterChip, status === value && styles.filterChipActive]} onPress={() => setStatus(value)}><Text style={[styles.filterChipText, status === value && styles.filterChipTextActive]}>{label}</Text></TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.secondaryAction} onPress={() => { setSearch(''); setStatus(''); setPage(1); }}><Ionicons name="refresh-outline" size={17} color={TAKO_BLUE} /><Text style={styles.secondaryActionText}>Réinitialiser</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.directoryTableScroller}>
        <View style={[styles.clientTable, { minWidth: 1390 }]}>
          <View style={[styles.clientTableRow, styles.clientTableHeader]}>
            {['N° carte', 'UID (identifiant NFC)', 'Client', 'Solde disponible', 'Statut', 'Date d’activation', 'Dernière utilisation', 'Actions'].map((header) => <Text key={header} style={[styles.clientTableCell, styles.clientTableHeaderText]}>{header}</Text>)}
          </View>
          {loading ? <View style={styles.clientTableLoading}><ActivityIndicator color={TAKO_BLUE} /></View> : cards.length ? cards.map((card: any) => (
            <View key={card.cardId} style={styles.clientTableRow}>
              <View style={[styles.clientTableCell, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}><Image source={require('../assets/images/client-physical-card.png')} style={{ width: 50, height: 31, borderRadius: 5 }} resizeMode="cover" /><View><Text style={styles.clientName}>{card.cardId}</Text><Text style={styles.clientSubtext}>Carte TaKo</Text></View></View>
              <Text style={styles.clientTableCellText}>{card.cardId}</Text>
              <View style={styles.clientTableCell}><Text style={styles.clientName}>{card.clientName || 'Client inconnu'}</Text><Text style={styles.clientSubtext}>{card.clientPhone || card.clientId}</Text></View>
              <Text style={styles.clientBalance}>{money(card.balance)}</Text>
              <View style={styles.clientTableCell}><Text style={card.blocked ? styles.statusBlocked : styles.statusActive}>● {card.blocked ? 'Bloquée' : 'Active'}</Text></View>
              <Text style={styles.clientTableCellText}>{formatDate(card.activatedAt)}</Text>
              <Text style={styles.clientTableCellText}>{card.lastUsedAt ? formatDate(card.lastUsedAt) : 'Jamais utilisée'}</Text>
              <View style={[styles.clientTableCell, styles.clientActions]}><TouchableOpacity style={styles.clientActionButton} onPress={() => viewCard(card)}><Ionicons name="eye-outline" size={19} color={TAKO_BLUE} /></TouchableOpacity><TouchableOpacity style={styles.clientActionButton} disabled={actionLoading} onPress={() => toggleCard(card)}><Ionicons name={card.blocked ? 'lock-open-outline' : 'lock-closed-outline'} size={19} color={card.blocked ? '#0A9D50' : '#DC2626'} /></TouchableOpacity></View>
            </View>
          )) : <View style={styles.clientTableLoading}><Text style={styles.cardText}>Aucune carte NFC trouvée.</Text></View>}
        </View>
      </View>
      <View style={styles.clientPagination}><Text style={styles.cardText}>Affichage de {cards.length} sur {pagination.total || 0} carte(s)</Text><View style={styles.paginationButtons}><TouchableOpacity disabled={page <= 1} style={styles.pageButton} onPress={() => setPage(Math.max(1, page - 1))}><Ionicons name="chevron-back" size={17} color={TAKO_BLUE} /></TouchableOpacity><Text style={styles.pageCurrent}>{page} / {totalPages}</Text><TouchableOpacity disabled={page >= totalPages} style={styles.pageButton} onPress={() => setPage(Math.min(totalPages, page + 1))}><Ionicons name="chevron-forward" size={17} color={TAKO_BLUE} /></TouchableOpacity></View></View>
    </View>
  );
}

function ClientDirectoryScreen({
  directory,
  loading,
  search,
  setSearch,
  status,
  setStatus,
  cardFilter,
  setCardFilter,
  page,
  setPage,
  addClient,
  viewClient,
  editClient,
  manageCard,
  closeClient,
  actionLoading,
}: {
  directory: any;
  loading: boolean;
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  cardFilter: '' | 'with' | 'without';
  setCardFilter: (value: '' | 'with' | 'without') => void;
  page: number;
  setPage: (value: number) => void;
  addClient: () => void;
  viewClient: (client: any) => void;
  editClient: (client: any) => void;
  manageCard: (client: any) => void;
  closeClient: (client: any) => void;
  actionLoading: boolean;
}) {
  const stats = directory?.stats || {};
  const clients = directory?.clients || [];
  const pagination = directory?.pagination || { total: 0, limit: 20 };
  const totalPages = Math.max(1, Math.ceil(Number(pagination.total || 0) / Number(pagination.limit || 20)));

  return (
    <View style={styles.clientDirectory}>
      <View style={styles.referenceHeader}>
        <TouchableOpacity style={[styles.referencePrimary, { marginLeft: 'auto' }]} onPress={addClient}>
          <Ionicons name="add-outline" size={18} color="white" />
          <Text style={styles.referencePrimaryText}>Ajouter un client</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.clientStats}>
        <ClientStat icon="people-outline" label="Total clients" value={Number(stats.total || 0)} tone="blue" />
        <ClientStat icon="checkmark-circle-outline" label="Clients actifs" value={Number(stats.active || 0)} tone="green" total={Number(stats.total || 0)} />
        <ClientStat icon="pause-circle-outline" label="Clients inactifs" value={Number(stats.inactive || 0)} tone="orange" total={Number(stats.total || 0)} />
        <ClientStat icon="lock-closed-outline" label="Clients bloqués" value={Number(stats.blocked || 0)} tone="red" total={Number(stats.total || 0)} />
      </View>

      <View style={styles.clientFilters}>
        <View style={styles.clientSearchBox}>
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher par nom, téléphone, e-mail ou ID…"
            placeholderTextColor="#94A3B8"
            style={styles.clientSearchInput}
          />
        </View>
        <View style={styles.filterChoices}>
          {[
            ['', 'Tous'],
            ['active', 'Actifs'],
            ['inactive', 'Inactifs'],
            ['blocked', 'Bloqués'],
          ].map(([value, label]) => (
            <TouchableOpacity key={label} style={[styles.filterChip, status === value && styles.filterChipActive]} onPress={() => setStatus(value)}>
              <Text style={[styles.filterChipText, status === value && styles.filterChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.filterChoices}>
          {[
            ['', 'Toutes cartes'],
            ['with', 'Avec NFC'],
            ['without', 'Sans NFC'],
          ].map(([value, label]) => (
            <TouchableOpacity key={label} style={[styles.filterChip, cardFilter === value && styles.filterChipActive]} onPress={() => setCardFilter(value as '' | 'with' | 'without')}>
              <Text style={[styles.filterChipText, cardFilter === value && styles.filterChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.directoryTableScroller}>
        <View style={styles.clientTable}>
          <View style={[styles.clientTableRow, styles.clientTableHeader]}>
            {['Client', 'Téléphone', 'E-mail', 'Solde (CDF)', 'Carte NFC', 'Statut', 'Inscription', 'Dernière connexion', 'Actions'].map((header) => (
              <Text key={header} style={[styles.clientTableCell, styles.clientTableHeaderText]}>{header}</Text>
            ))}
          </View>
          {loading ? (
            <View style={styles.clientTableLoading}><ActivityIndicator color={TAKO_BLUE} /></View>
          ) : clients.length ? clients.map((client: any) => (
            <View key={client.id} style={styles.clientTableRow}>
              <View style={styles.clientTableCell}>
                <Text style={styles.clientName}>{client.fullName}</Text>
                <Text style={styles.clientSubtext}>{client.id}</Text>
              </View>
              <Text style={styles.clientTableCellText}>{client.phone || 'Non disponible'}</Text>
              <Text style={styles.clientTableCellText}>{client.email || 'Non disponible'}</Text>
              <Text style={styles.clientBalance}>{Number(client.balance || 0).toLocaleString('fr-FR')} CDF</Text>
              <View style={styles.clientTableCell}>
                <Text style={styles.clientTableCellText}>{client.nfcCard?.cardId || 'Aucune'}</Text>
                {client.nfcCard ? <Text style={client.nfcCard.blocked ? styles.statusBlocked : styles.statusActive}>{client.nfcCard.blocked ? 'Suspendue' : 'Active'}</Text> : null}
              </View>
              <View style={styles.clientTableCell}><Text style={client.status === 'active' ? styles.statusActive : client.status === 'blocked' ? styles.statusBlocked : styles.statusInactive}>{client.status || 'Non disponible'}</Text></View>
              <Text style={styles.clientTableCellText}>{formatDate(client.createdAt)}</Text>
              <Text style={styles.clientTableCellText}>{client.lastLoginAt ? formatDate(client.lastLoginAt) : 'Non disponible'}</Text>
              <View style={[styles.clientTableCell, styles.clientActions]}>
                <TouchableOpacity style={styles.clientActionButton} disabled={actionLoading} onPress={() => viewClient(client)} accessibilityLabel={`Voir ${client.fullName}`}><Ionicons name="eye-outline" size={19} color={TAKO_BLUE} /></TouchableOpacity>
                <TouchableOpacity style={styles.clientActionButton} disabled={actionLoading} onPress={() => editClient(client)} accessibilityLabel={`Modifier ${client.fullName}`}><Ionicons name="create-outline" size={19} color={TAKO_BLUE} /></TouchableOpacity>
                <TouchableOpacity style={styles.clientActionButton} disabled={actionLoading} onPress={() => manageCard(client)} accessibilityLabel={`Gérer la carte de ${client.fullName}`}><Ionicons name="card-outline" size={19} color={TAKO_BLUE} /></TouchableOpacity>
                <TouchableOpacity style={styles.clientActionButton} disabled={actionLoading || client.status === 'closed'} onPress={() => closeClient(client)} accessibilityLabel={`Fermer le compte de ${client.fullName}`}><Ionicons name="trash-outline" size={19} color={client.status === 'closed' ? '#CBD5E1' : '#DC2626'} /></TouchableOpacity>
              </View>
            </View>
          )) : (
            <View style={styles.clientTableLoading}><Text style={styles.cardText}>Aucun client trouvé.</Text></View>
          )}
        </View>
      </View>

      <View style={styles.clientPagination}>
        <Text style={styles.cardText}>{pagination.total || 0} client(s)</Text>
        <View style={styles.paginationButtons}>
          <TouchableOpacity disabled={page <= 1} style={styles.pageButton} onPress={() => setPage(Math.max(1, page - 1))}><Ionicons name="chevron-back" size={17} color={TAKO_BLUE} /></TouchableOpacity>
          <Text style={styles.pageCurrent}>{page} / {totalPages}</Text>
          <TouchableOpacity disabled={page >= totalPages} style={styles.pageButton} onPress={() => setPage(Math.min(totalPages, page + 1))}><Ionicons name="chevron-forward" size={17} color={TAKO_BLUE} /></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function ClientStat({ icon, label, value, tone, total }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number; tone: 'blue' | 'green' | 'orange' | 'red'; total?: number }) {
  const percentage = total && total > 0 ? `${Math.round((value / total) * 1000) / 10}% du total` : 'Données réelles';
  const toneColor = tone === 'green' ? '#087B35' : tone === 'orange' ? '#B45309' : tone === 'red' ? '#B91C1C' : TAKO_BLUE;
  return (
    <View style={styles.clientStat}>
      <View style={styles.clientStatIcon}><Ionicons name={icon} size={25} color={toneColor} /></View>
      <View>
        <Text style={styles.clientStatLabel}>{label}</Text>
        <Text style={styles.clientStatValue}>{value.toLocaleString('fr-FR')}</Text>
        <Text style={styles.clientSubtext}>{total ? percentage : 'Tous les clients'}</Text>
      </View>
    </View>
  );
}

function DriverDirectoryScreen({
  directory, loading, search, setSearch, status, setStatus, zone, setZone, page, setPage,
  addDriver, viewDriver, editDriver, closeDriver, actionLoading,
}: {
  directory: any; loading: boolean; search: string; setSearch: (value: string) => void;
  status: string; setStatus: (value: string) => void; zone: string; setZone: (value: string) => void;
  page: number; setPage: (value: number) => void; addDriver: () => void;
  viewDriver: (driver: any) => void; editDriver: (driver: any) => void;
  closeDriver: (driver: any) => void; actionLoading: boolean;
}) {
  const stats = directory?.stats || {};
  const drivers = directory?.drivers || [];
  const pagination = directory?.pagination || { total: 0, limit: 20 };
  const totalPages = Math.max(1, Math.ceil(Number(pagination.total || 0) / Number(pagination.limit || 20)));
  const statusLabel = (value: string) => value === 'active' ? 'Actif' : value === 'pending' ? 'En attente' : value === 'suspended' ? 'Suspendu' : value === 'blocked' ? 'Bloqué' : value === 'refused' ? 'Refusé' : value || 'Non disponible';
  const statusStyle = (value: string) => value === 'active' ? styles.statusActive : ['blocked', 'refused', 'suspended'].includes(value) ? styles.statusBlocked : styles.statusInactive;
  const exportDrivers = () => {
    if (Platform.OS !== 'web' || !drivers.length) {
      Alert.alert('Export indisponible', 'Aucun chauffeur à exporter.');
      return;
    }
    const rows = [
      ['ID', 'Nom', 'Téléphone', 'E-mail', 'Véhicule', 'Plaque', 'Ligne / Zone', 'Solde CDF', 'Total gagné CDF', 'Statut'],
      ...drivers.map((driver: any) => [driver.id, driver.fullName, driver.phone, driver.email, driver.vehicle, driver.busPlate, driver.route, driver.balance, driver.totalEarned, statusLabel(driver.status)]),
    ];
    const csv = rows.map((row) => row.map((value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'chauffeurs-tako.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <View style={styles.clientDirectory}>
      <View style={styles.referenceHeader}>
        <View style={[styles.driverDetailActions, { marginLeft: 'auto' }]}>
          <TouchableOpacity style={styles.secondaryAction} onPress={exportDrivers}><Ionicons name="download-outline" size={18} color={TAKO_BLUE} /><Text style={styles.secondaryActionText}>Exporter</Text></TouchableOpacity>
          <TouchableOpacity style={styles.referencePrimary} onPress={addDriver}><Ionicons name="add-outline" size={18} color="white" /><Text style={styles.referencePrimaryText}>Ajouter un chauffeur</Text></TouchableOpacity>
        </View>
      </View>
      <View style={styles.clientStats}>
        <ClientStat icon="people-outline" label="Total chauffeurs" value={Number(stats.total || 0)} tone="blue" />
        <ClientStat icon="checkmark-circle-outline" label="Chauffeurs actifs" value={Number(stats.active || 0)} tone="green" total={Number(stats.total || 0)} />
        <ClientStat icon="time-outline" label="En attente" value={Number(stats.pending || 0)} tone="orange" total={Number(stats.total || 0)} />
        <ClientStat icon="pause-circle-outline" label="Suspendus" value={Number(stats.suspended || 0)} tone="red" total={Number(stats.total || 0)} />
        <ClientStat icon="close-circle-outline" label="Bloqués" value={Number(stats.blocked || 0)} tone="red" total={Number(stats.total || 0)} />
      </View>
      <View style={styles.clientFilters}>
        <View style={styles.clientSearchBox}><Ionicons name="search-outline" size={18} color="#64748B" /><TextInput value={search} onChangeText={setSearch} placeholder="Rechercher par nom, téléphone ou plaque…" placeholderTextColor="#94A3B8" style={styles.clientSearchInput} /></View>
        <View style={styles.filterChoices}>
          {[['', 'Tous'], ['active', 'Actifs'], ['pending', 'En attente'], ['suspended', 'Suspendus'], ['blocked', 'Bloqués']].map(([value, label]) => (
            <TouchableOpacity key={label} style={[styles.filterChip, status === value && styles.filterChipActive]} onPress={() => setStatus(value)}><Text style={[styles.filterChipText, status === value && styles.filterChipTextActive]}>{label}</Text></TouchableOpacity>
          ))}
        </View>
        <View style={styles.clientSearchBox}><Ionicons name="location-outline" size={18} color="#64748B" /><TextInput value={zone} onChangeText={setZone} placeholder="Filtrer par ligne ou zone…" placeholderTextColor="#94A3B8" style={styles.clientSearchInput} /></View>
        <TouchableOpacity style={styles.filterChip} onPress={() => { setSearch(''); setStatus(''); setZone(''); }}><Text style={styles.filterChipText}>Réinitialiser</Text></TouchableOpacity>
      </View>
      <View style={styles.directoryTableScroller}>
        <View style={styles.driverTable}>
          <View style={[styles.clientTableRow, styles.clientTableHeader]}>
            {['Chauffeur', 'Téléphone', 'Véhicule', 'Plaque', 'Ligne / Zone', 'Solde disponible', 'Total gagné', 'Statut', 'Validation', 'Actions'].map((header) => <Text key={header} style={[styles.driverTableCell, styles.clientTableHeaderText]}>{header}</Text>)}
          </View>
          {loading ? <View style={styles.clientTableLoading}><ActivityIndicator color={TAKO_BLUE} /></View> : drivers.length ? drivers.map((driver: any) => (
            <View key={driver.id} style={styles.clientTableRow}>
              <View style={styles.driverTableCell}><Text style={styles.clientName}>{driver.fullName}</Text><Text style={styles.clientSubtext}>{driver.id}</Text></View>
              <Text style={styles.driverTableCell}>{driver.phone || 'Non disponible'}</Text>
              <Text style={styles.driverTableCell}>{driver.vehicle || 'Non disponible'}</Text>
              <Text style={styles.driverTableCell}>{driver.busPlate || 'Non disponible'}</Text>
              <Text style={styles.driverTableCell}>{driver.route || 'Non disponible'}</Text>
              <Text style={[styles.driverTableCell, styles.clientBalance]}>{Number(driver.balance || 0).toLocaleString('fr-FR')} CDF</Text>
              <Text style={styles.driverTableCell}>{Number(driver.totalEarned || 0).toLocaleString('fr-FR')} CDF</Text>
              <View style={styles.driverTableCell}><Text style={statusStyle(driver.status)}>{statusLabel(driver.status)}</Text></View>
              <View style={styles.driverTableCell}><Text style={driver.status === 'active' ? styles.statusActive : driver.status === 'refused' ? styles.statusBlocked : styles.statusInactive}>{driver.status === 'active' ? 'Validé' : driver.status === 'refused' ? 'Refusé' : 'En vérification'}</Text></View>
              <View style={[styles.driverTableCell, styles.clientActions]}>
                <TouchableOpacity style={styles.clientActionButton} disabled={actionLoading} onPress={() => viewDriver(driver)}><Ionicons name="eye-outline" size={19} color={TAKO_BLUE} /></TouchableOpacity>
                <TouchableOpacity style={styles.clientActionButton} disabled={actionLoading} onPress={() => editDriver(driver)}><Ionicons name="create-outline" size={19} color={TAKO_BLUE} /></TouchableOpacity>
                <TouchableOpacity style={styles.clientActionButton} disabled={actionLoading} onPress={() => viewDriver(driver)}><Ionicons name="wallet-outline" size={19} color={TAKO_BLUE} /></TouchableOpacity>
                <TouchableOpacity style={styles.clientActionButton} disabled={actionLoading} onPress={() => closeDriver(driver)}><Ionicons name="trash-outline" size={19} color="#DC2626" /></TouchableOpacity>
              </View>
            </View>
          )) : <View style={styles.clientTableLoading}><Text style={styles.cardText}>Aucun chauffeur trouvé.</Text></View>}
        </View>
      </View>
      <View style={styles.clientPagination}><Text style={styles.cardText}>{pagination.total || 0} chauffeur(s)</Text><View style={styles.paginationButtons}>
        <TouchableOpacity disabled={page <= 1} style={styles.pageButton} onPress={() => setPage(Math.max(1, page - 1))}><Ionicons name="chevron-back" size={17} color={TAKO_BLUE} /></TouchableOpacity>
        <Text style={styles.pageCurrent}>{page} / {totalPages}</Text>
        <TouchableOpacity disabled={page >= totalPages} style={styles.pageButton} onPress={() => setPage(Math.min(totalPages, page + 1))}><Ionicons name="chevron-forward" size={17} color={TAKO_BLUE} /></TouchableOpacity>
      </View></View>
    </View>
  );
}

function DriverDetails({ driver, editing, setDriver, loading, save, changeStatus }: {
  driver: any; editing: boolean; setDriver: (driver: any) => void; loading: boolean;
  save: () => void; changeStatus: (status: 'active' | 'suspended' | 'blocked' | 'refused') => void;
}) {
  const fields = [
    ['Nom complet', 'fullName'], ['Téléphone', 'phone'], ['E-mail', 'email'],
    ['Véhicule', 'vehicle'], ['Plaque', 'busPlate'], ['Ligne / Zone', 'route'],
  ];
  return (
    <View style={styles.driverDetails}>
      <View style={styles.driverProfileTop}>
        <View style={styles.driverAvatar}><Ionicons name="person-outline" size={34} color={TAKO_BLUE} /></View>
        <View><Text style={styles.referenceTitle}>{driver.fullName}</Text><Text style={styles.cardText}>{driver.id}</Text></View>
      </View>
      <View style={styles.clientStats}>
        <MiniMetric label="Solde disponible" value={`${Number(driver.balance || 0).toLocaleString('fr-FR')} CDF`} />
        <MiniMetric label="Total gagné" value={`${Number(driver.totalEarned || 0).toLocaleString('fr-FR')} CDF`} />
        <MiniMetric label="Paiements reçus" value={String(driver.paymentCount || 0)} />
      </View>
      <Text style={styles.cardTitle}>Informations du chauffeur</Text>
      <View style={styles.driverFormGrid}>
        {fields.map(([label, key]) => <View key={key} style={styles.driverFormField}><Text style={styles.formLabel}>{label}</Text>{editing ? (
          <TextInput value={driver[key] || ''} onChangeText={(value) => setDriver({ ...driver, [key]: value })} style={styles.driverInput} placeholder="Non disponible" placeholderTextColor="#94A3B8" />
        ) : <Text style={styles.clientTableCellText}>{driver[key] || 'Non disponible'}</Text>}</View>)}
      </View>
      <Text style={styles.cardText}>Opérateur de retrait : {driver.withdrawalOperator || 'Non disponible'}</Text>
      <View style={styles.driverDetailActions}>
        {editing ? <TouchableOpacity style={styles.referencePrimary} disabled={loading} onPress={save}>{loading ? <ActivityIndicator color="white" /> : <Text style={styles.referencePrimaryText}>Enregistrer</Text>}</TouchableOpacity> : null}
        {driver.status !== 'active' ? <TouchableOpacity style={styles.referencePrimary} disabled={loading} onPress={() => changeStatus('active')}><Text style={styles.referencePrimaryText}>Valider</Text></TouchableOpacity> : null}
        {driver.status === 'active' ? <TouchableOpacity style={styles.secondaryAction} disabled={loading} onPress={() => changeStatus('suspended')}><Text style={styles.secondaryActionText}>Suspendre</Text></TouchableOpacity> : null}
        {driver.status !== 'blocked' ? <TouchableOpacity style={styles.confirmYes} disabled={loading} onPress={() => changeStatus('blocked')}><Text style={styles.confirmYesText}>Bloquer</Text></TouchableOpacity> : null}
        {driver.status === 'pending' ? <TouchableOpacity style={styles.confirmNo} disabled={loading} onPress={() => changeStatus('refused')}><Text style={styles.confirmNoText}>Refuser</Text></TouchableOpacity> : null}
      </View>
    </View>
  );
}

function AgentDirectoryScreen({
  directory, loading, search, setSearch, status, setStatus, zone, setZone, agentRole, setAgentRole,
  manager, setManager, page, setPage, addAgent, viewAgent, editAgent, creditAgent, closeAgent, actionLoading,
}: {
  directory: any; loading: boolean; search: string; setSearch: (value: string) => void;
  status: string; setStatus: (value: string) => void; zone: string; setZone: (value: string) => void;
  agentRole: string; setAgentRole: (value: string) => void; manager: string; setManager: (value: string) => void;
  page: number; setPage: (value: number) => void; addAgent: () => void;
  viewAgent: (agent: any) => void; editAgent: (agent: any) => void; creditAgent: (agent: any) => void; closeAgent: (agent: any) => void; actionLoading: boolean;
}) {
  const stats = directory?.stats || {};
  const agents = directory?.agents || [];
  const pagination = directory?.pagination || { total: 0, limit: 20 };
  const totalPages = Math.max(1, Math.ceil(Number(pagination.total || 0) / Number(pagination.limit || 20)));
  const statusLabel = (value: string) => value === 'active' ? 'Actif' : value === 'pending' ? 'En attente' : value === 'inactive' ? 'Désactivé' : value === 'blocked' ? 'Bloqué' : value || 'Non disponible';
  const statusStyle = (value: string) => value === 'active' ? styles.statusActive : value === 'pending' ? styles.statusInactive : styles.statusBlocked;
  const reset = () => { setSearch(''); setStatus(''); setZone(''); setAgentRole(''); setManager(''); };
  const exportAgents = () => {
    if (Platform.OS !== 'web' || !agents.length) return Alert.alert('Export indisponible', 'Aucun agent à exporter.');
    const rows = [
      ['ID', 'Nom', 'Téléphone', 'E-mail', 'Zone', 'Responsable', 'Rôle', 'Statut', 'Date de création'],
      ...agents.map((agent: any) => [agent.id, agent.fullName, agent.phone, agent.email, agent.assignmentZone, agent.managerName, agent.agentRole, statusLabel(agent.status), agent.createdAt]),
    ];
    const csv = rows.map((row) => row.map((value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = 'agents-tako.csv'; link.click(); URL.revokeObjectURL(link.href);
  };
  return (
    <View style={styles.clientDirectory}>
      <View style={styles.referenceHeader}>
        <View style={[styles.driverDetailActions, { marginLeft: 'auto' }]}>
          <TouchableOpacity style={styles.secondaryAction} onPress={exportAgents}><Ionicons name="download-outline" size={18} color={TAKO_BLUE} /><Text style={styles.secondaryActionText}>Exporter</Text></TouchableOpacity>
          <TouchableOpacity style={styles.referencePrimary} onPress={addAgent}><Ionicons name="add-outline" size={18} color="white" /><Text style={styles.referencePrimaryText}>Ajouter un agent</Text></TouchableOpacity>
        </View>
      </View>
      <View style={styles.clientStats}>
        <ClientStat icon="people-outline" label="Total agents" value={Number(stats.total || 0)} tone="blue" />
        <ClientStat icon="checkmark-circle-outline" label="Agents actifs" value={Number(stats.active || 0)} tone="green" total={Number(stats.total || 0)} />
        <ClientStat icon="time-outline" label="En attente" value={Number(stats.pending || 0)} tone="orange" total={Number(stats.total || 0)} />
        <ClientStat icon="close-circle-outline" label="Désactivés" value={Number(stats.inactive || 0)} tone="red" total={Number(stats.total || 0)} />
        <ClientStat icon="shield-outline" label="Bloqués" value={Number(stats.blocked || 0)} tone="red" total={Number(stats.total || 0)} />
      </View>
      <View style={styles.clientFilters}>
        <View style={styles.clientSearchBox}><Ionicons name="search-outline" size={18} color="#64748B" /><TextInput value={search} onChangeText={setSearch} placeholder="Rechercher par nom, téléphone ou e-mail…" placeholderTextColor="#94A3B8" style={styles.clientSearchInput} /></View>
        <View style={styles.filterChoices}>{[['', 'Tous'], ['active', 'Actifs'], ['pending', 'En attente'], ['inactive', 'Désactivés'], ['blocked', 'Bloqués']].map(([value, label]) => <TouchableOpacity key={label} style={[styles.filterChip, status === value && styles.filterChipActive]} onPress={() => setStatus(value)}><Text style={[styles.filterChipText, status === value && styles.filterChipTextActive]}>{label}</Text></TouchableOpacity>)}</View>
        <View style={styles.agentFilterInputs}>
          <TextInput value={zone} onChangeText={setZone} placeholder="Zone d’affectation" placeholderTextColor="#94A3B8" style={styles.agentFilterInput} />
          <TextInput value={agentRole} onChangeText={setAgentRole} placeholder="Rôle" placeholderTextColor="#94A3B8" style={styles.agentFilterInput} />
          <TextInput value={manager} onChangeText={setManager} placeholder="Responsable" placeholderTextColor="#94A3B8" style={styles.agentFilterInput} />
        </View>
        <TouchableOpacity style={styles.filterChip} onPress={reset}><Text style={styles.filterChipText}>Réinitialiser</Text></TouchableOpacity>
      </View>
      <View style={styles.directoryTableScroller}><View style={styles.agentTable}>
        <View style={[styles.clientTableRow, styles.clientTableHeader]}>{['Agent', 'Téléphone', 'E-mail', 'Zone d’affectation', 'Responsable', 'Rôle', 'Statut', 'Date de création', 'Dernière connexion', 'Actions'].map((header) => <Text key={header} style={[styles.driverTableCell, styles.clientTableHeaderText]}>{header}</Text>)}</View>
        {loading ? <View style={styles.clientTableLoading}><ActivityIndicator color={TAKO_BLUE} /></View> : agents.length ? agents.map((agent: any) => <View key={agent.id} style={styles.clientTableRow}>
          <View style={styles.driverTableCell}><Text style={styles.clientName}>{agent.fullName}</Text><Text style={styles.clientSubtext}>{agent.id}</Text></View>
          <Text style={styles.driverTableCell}>{agent.phone || 'Non disponible'}</Text><Text style={styles.driverTableCell}>{agent.email || 'Non disponible'}</Text>
          <Text style={styles.driverTableCell}>{agent.assignmentZone || 'Non disponible'}</Text><Text style={styles.driverTableCell}>{agent.managerName || 'Non disponible'}</Text>
          <View style={styles.driverTableCell}><Text style={styles.agentRoleBadge}>{agent.agentRole || 'Agent terrain'}</Text></View>
          <View style={styles.driverTableCell}><Text style={statusStyle(agent.status)}>{statusLabel(agent.status)}</Text></View>
          <Text style={styles.driverTableCell}>{formatDate(agent.createdAt)}</Text><Text style={styles.driverTableCell}>{agent.lastLoginAt ? formatDate(agent.lastLoginAt) : 'Non disponible'}</Text>
          <View style={[styles.driverTableCell, styles.clientActions]}>
            <TouchableOpacity style={styles.clientActionButton} disabled={actionLoading} onPress={() => viewAgent(agent)}><Ionicons name="eye-outline" size={19} color={TAKO_BLUE} /></TouchableOpacity>
            <TouchableOpacity style={styles.clientActionButton} disabled={actionLoading} onPress={() => editAgent(agent)}><Ionicons name="create-outline" size={19} color={TAKO_BLUE} /></TouchableOpacity>
            <TouchableOpacity style={styles.clientActionButton} disabled={actionLoading || agent.status !== 'active'} onPress={() => creditAgent(agent)} accessibilityLabel={`Créditer ${agent.fullName}`}><Ionicons name="cash-outline" size={19} color={agent.status === 'active' ? '#087B35' : '#CBD5E1'} /></TouchableOpacity>
            <TouchableOpacity style={styles.clientActionButton} disabled={actionLoading} onPress={() => viewAgent(agent)}><Ionicons name="lock-closed-outline" size={19} color={TAKO_BLUE} /></TouchableOpacity>
            <TouchableOpacity style={styles.clientActionButton} disabled={actionLoading} onPress={() => closeAgent(agent)}><Ionicons name="trash-outline" size={19} color="#DC2626" /></TouchableOpacity>
          </View>
        </View>) : <View style={styles.clientTableLoading}><Text style={styles.cardText}>Aucun agent trouvé.</Text></View>}
      </View></View>
      <View style={styles.clientPagination}><Text style={styles.cardText}>{pagination.total || 0} agent(s)</Text><View style={styles.paginationButtons}>
        <TouchableOpacity disabled={page <= 1} style={styles.pageButton} onPress={() => setPage(Math.max(1, page - 1))}><Ionicons name="chevron-back" size={17} color={TAKO_BLUE} /></TouchableOpacity><Text style={styles.pageCurrent}>{page} / {totalPages}</Text><TouchableOpacity disabled={page >= totalPages} style={styles.pageButton} onPress={() => setPage(Math.min(totalPages, page + 1))}><Ionicons name="chevron-forward" size={17} color={TAKO_BLUE} /></TouchableOpacity>
      </View></View>
    </View>
  );
}

function AgentDetails({ agent, editing, setAgent, loading, save, changeStatus }: {
  agent: any; editing: boolean; setAgent: (agent: any) => void; loading: boolean; save: () => void;
  changeStatus: (status: 'active' | 'pending' | 'inactive' | 'blocked') => void;
}) {
  const fields = [['Nom complet', 'fullName'], ['Téléphone', 'phone'], ['E-mail', 'email'], ['Zone d’affectation', 'assignmentZone'], ['Responsable', 'managerName'], ['Rôle', 'agentRole']];
  return <View style={styles.driverDetails}>
    <View style={styles.driverProfileTop}><View style={styles.driverAvatar}><Ionicons name="person-outline" size={34} color={TAKO_BLUE} /></View><View><Text style={styles.referenceTitle}>{agent.fullName}</Text><Text style={styles.cardText}>{agent.id}</Text></View></View>
    <View style={styles.clientStats}><MiniMetric label="Solde agent" value={`${Number(agent.balance || 0).toLocaleString('fr-FR')} CDF`} /><MiniMetric label="Statut" value={agent.status || 'Non disponible'} /><MiniMetric label="Dernière connexion" value={agent.lastLoginAt ? formatDate(agent.lastLoginAt) : 'Non disponible'} /></View>
    <Text style={styles.cardTitle}>Informations de l’agent</Text>
    <View style={styles.driverFormGrid}>{fields.map(([label, key]) => <View key={key} style={styles.driverFormField}><Text style={styles.formLabel}>{label}</Text>{editing ? <TextInput value={agent[key] || ''} onChangeText={(value) => setAgent({ ...agent, [key]: value })} style={styles.driverInput} placeholder="Non disponible" placeholderTextColor="#94A3B8" /> : <Text style={styles.clientTableCellText}>{agent[key] || 'Non disponible'}</Text>}</View>)}</View>
    <View style={styles.driverDetailActions}>
      {editing ? <TouchableOpacity style={styles.referencePrimary} disabled={loading} onPress={save}>{loading ? <ActivityIndicator color="white" /> : <Text style={styles.referencePrimaryText}>Enregistrer</Text>}</TouchableOpacity> : null}
      {agent.status !== 'active' ? <TouchableOpacity style={styles.referencePrimary} disabled={loading} onPress={() => changeStatus('active')}><Text style={styles.referencePrimaryText}>Activer</Text></TouchableOpacity> : null}
      {agent.status === 'active' ? <TouchableOpacity style={styles.secondaryAction} disabled={loading} onPress={() => changeStatus('inactive')}><Text style={styles.secondaryActionText}>Désactiver</Text></TouchableOpacity> : null}
      {agent.status !== 'blocked' ? <TouchableOpacity style={styles.confirmYes} disabled={loading} onPress={() => changeStatus('blocked')}><Text style={styles.confirmYesText}>Bloquer l’accès</Text></TouchableOpacity> : null}
    </View>
  </View>;
}

function DashboardRecentTable({
  title,
  headers,
  items,
}: {
  title: string;
  headers: string[];
  items: TransactionNotification[];
}) {
  return (
    <View style={[styles.card, styles.recentTableCard]}>
      <View style={styles.recentTableTitleRow}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.moreLink}>Voir tout</Text>
      </View>
      <View style={styles.recentHeader}>
        {headers.map((header) => <Text key={header} style={styles.recentHeaderCell}>{header}</Text>)}
      </View>
      {items.length ? items.map((item) => (
        <View key={item.id} style={styles.recentRow}>
          <Text style={styles.recentCell}>Client TaKo</Text>
          <Text style={styles.recentCell}>{item.amount || 0} FC</Text>
          <Text style={styles.recentCell}>Recharge</Text>
          <Text style={styles.recentStatus}>Réussie</Text>
          <Text style={styles.recentCell}>{formatDate(item.createdAt)}</Text>
        </View>
      )) : (
        <View style={styles.recentEmpty}><Text style={styles.cardText}>Aucune opération enregistrée.</Text></View>
      )}
    </View>
  );
}

function AdminModuleSection({ module, dashboard }: { module: ModuleDefinition; dashboard?: any }) {
  if (module.kind === 'notifications') {
    return (
      <View style={styles.referencePage}>
        <View style={styles.referenceHeader}>
          <View><Text style={styles.referenceTitle}>{module.title}</Text><Text style={styles.cardText}>{module.description}</Text></View>
        </View>
        <View style={[styles.card, styles.notificationComposer]}>
          <Text style={styles.cardTitle}>Envoyer une notification</Text>
          <Text style={styles.formLabel}>Type de notification</Text>
          <View style={styles.channelChoices}>
            {['Notification in-app', 'SMS', 'E-mail', 'WhatsApp'].map((channel, index) => (
              <View key={channel} style={[styles.channelChoice, index === 0 && styles.channelChoiceActive]}>
                <Ionicons name={index === 0 ? 'notifications-outline' : index === 1 ? 'chatbubble-outline' : index === 2 ? 'mail-outline' : 'logo-whatsapp'} size={22} color={TAKO_BLUE} />
                <Text style={styles.channelChoiceText}>{channel}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.formLabel}>Destinataires</Text>
          <View style={styles.referenceSearch}><Ionicons name="people-outline" size={18} color="#64748B" /><Text style={styles.referencePlaceholder}>Tous les clients</Text></View>
          <Text style={styles.formLabel}>Message</Text>
          <TextInput multiline placeholder="Votre message…" placeholderTextColor="#94A3B8" style={styles.messageInput} />
          <TouchableOpacity style={styles.referencePrimary}><Text style={styles.referencePrimaryText}>{module.primaryAction}</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  if (module.kind === 'reports') {
    return (
      <View style={styles.referencePage}>
        <View style={styles.referenceHeader}>
          <View><Text style={styles.referenceTitle}>{module.title}</Text><Text style={styles.cardText}>{module.description}</Text></View>
          <TouchableOpacity style={styles.referencePrimary}><Ionicons name="download-outline" size={17} color="white" /><Text style={styles.referencePrimaryText}>{module.primaryAction}</Text></TouchableOpacity>
        </View>
        <View style={styles.reportMetrics}>
          <MiniMetric label="Chiffre d’affaires" value={`${dashboard?.collected ?? 0} FC`} />
          <MiniMetric label="Commissions gagnées" value={`${dashboard?.commission ?? 0} FC`} />
          <MiniMetric label="Montants chauffeurs" value={`${dashboard?.driverAmount ?? 0} FC`} />
          <MiniMetric label="Transactions totales" value={`${dashboard?.transactions ?? 0}`} />
        </View>
        <View style={[styles.card, styles.chartCard]}>
          <Text style={styles.cardTitle}>Évolution de l’activité</Text>
          <View style={styles.chartPlaceholder}>
            {[35, 58, 44, 72, 63, 86, 55, 92].map((height, index) => <View key={index} style={[styles.chartBar, { height }]} />)}
          </View>
        </View>
      </View>
    );
  }

  const treasuryAccounts = module.kind === 'treasury' ? ['M-Pesa', 'Orange Money', 'Airtel Money', 'Afrimoney'] : [];
  return (
    <View style={styles.referencePage}>
      <View style={styles.referenceHeader}>
        <View>
          <Text style={styles.referenceTitle}>{module.title}</Text>
          <Text style={styles.cardText}>{module.description}</Text>
        </View>
        <TouchableOpacity style={styles.referencePrimary}>
          <Ionicons name={module.kind === 'treasury' ? 'refresh-outline' : 'add-outline'} size={17} color="white" />
          <Text style={styles.referencePrimaryText}>{module.primaryAction}</Text>
        </TouchableOpacity>
      </View>

      {treasuryAccounts.length ? (
        <View style={styles.treasuryGrid}>
          {treasuryAccounts.map((account) => <MiniMetric key={account} label={account} value="0 CDF" />)}
        </View>
      ) : null}

      <View style={styles.referenceSearch}>
        <Ionicons name="search-outline" size={18} color="#64748B" />
        <Text style={styles.referencePlaceholder}>Rechercher dans {module.title.toLowerCase()}…</Text>
      </View>

      <View style={styles.referenceTable}>
        <View style={styles.referenceTableHeader}>
          {module.columns.map((column) => <Text key={column} style={styles.referenceHeaderCell}>{column}</Text>)}
        </View>
        <View style={styles.referenceEmpty}>
          <Ionicons name="file-tray-outline" size={30} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Aucune donnée enregistrée</Text>
          <Text style={styles.emptyText}>Les informations réelles apparaîtront ici dès leur enregistrement.</Text>
        </View>
      </View>
    </View>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniMetric}>
      <Text style={styles.miniMetricLabel}>{label}</Text>
      <Text style={styles.miniMetricValue}>{value}</Text>
      <Text style={styles.miniMetricStatus}>Disponible</Text>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  change,
  comparison,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone: 'blue' | 'green';
  change?: number | null;
  comparison?: string;
}) {
  const hasComparison = typeof change === 'number';
  const changeText = hasComparison ? `${change >= 0 ? '+' : ''}${change}%` : '—';
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, tone === 'green' && styles.statIconGreen]}>
        <Ionicons name={icon} size={22} color={tone === 'green' ? '#087B35' : TAKO_BLUE} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <View style={styles.statComparison}>
        <Text style={[styles.statChange, hasComparison && change < 0 && styles.statChangeNegative]}>{changeText}</Text>
        <Text style={styles.statComparisonLabel}>{hasComparison ? comparison : 'Donnée indisponible'}</Text>
      </View>
    </View>
  );
}

function ClientSearchCard({
  clientId,
  setClientId,
  findClient,
  loading,
  feedback,
}: {
  clientId: string;
  setClientId: (value: string) => void;
  findClient: () => void;
  loading: boolean;
  feedback: { type: 'success' | 'error'; message: string } | null;
}) {
  return (
    <View style={[styles.card, styles.searchCard]}>
      <Text style={styles.cardTitle}>Accès compte client</Text>
      <Text style={styles.cardText}>Entrez l’ID numérique permanent du client.</Text>

      <View style={styles.inputBox}>
        <Ionicons name="id-card-outline" size={24} color="#7B8798" />
        <TextInput
          placeholder="Ex: 1000000001"
          placeholderTextColor="#8B95A5"
          value={clientId}
          onChangeText={setClientId}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>

      {feedback ? (
        <View style={[styles.feedbackBox, feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
          <Ionicons
            name={feedback.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            size={20}
            color={feedback.type === 'error' ? '#B42318' : '#087B35'}
          />
          <Text style={[styles.feedbackText, feedback.type === 'error' ? styles.feedbackErrorText : styles.feedbackSuccessText]}>
            {feedback.message}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} disabled={loading} onPress={findClient}>
        {loading ? <ActivityIndicator color="white" /> : <Ionicons name="search" size={22} color="white" />}
        <Text style={styles.primaryButtonText}>Voir le compte client</Text>
      </TouchableOpacity>
    </View>
  );
}

function PendingApprovalsCard({
  title,
  users,
  approvingUserId,
  approve,
}: {
  title: string;
  users: any[];
  approvingUserId: string | null;
  approve: (userId: string) => void;
}) {
  return (
    <View style={[styles.card, styles.fullCard]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>Validez les comptes avant qu’ils puissent accéder à leur mode.</Text>

      {users.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title="Aucune demande" text="Les nouveaux comptes apparaîtront ici." />
      ) : (
        users.map((user) => (
          <View key={user.id} style={styles.pendingRow}>
            <View style={styles.pendingIcon}>
              <Ionicons name={user.role === 'agent' ? 'person-add-outline' : 'bus-outline'} size={22} color={TAKO_BLUE} />
            </View>
            <View style={styles.pendingInfo}>
              <Text style={styles.pendingName}>{user.fullName}</Text>
              <Text style={styles.pendingMeta}>{user.email || user.phone || user.id}</Text>
            </View>
            <TouchableOpacity
              style={styles.pendingButton}
              activeOpacity={0.9}
              disabled={approvingUserId === user.id}
              onPress={() => approve(user.id)}>
              {approvingUserId === user.id ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.pendingButtonText}>Valider</Text>
              )}
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

function InternalRechargeCard({
  clientId,
  setClientId,
  cardId,
  clearCardId,
  amount,
  setAmount,
  loading,
  confirm,
  scan,
  nfcLoading,
  readNfc,
  feedback,
}: {
  clientId: string;
  setClientId: (value: string) => void;
  cardId: string;
  clearCardId: () => void;
  amount: string;
  setAmount: (value: string) => void;
  loading: boolean;
  confirm: () => void;
  scan: () => void;
  nfcLoading: boolean;
  readNfc: () => void;
  feedback: { type: 'success' | 'error'; message: string } | null;
}) {
  return (
    <View style={[styles.card, styles.internalRechargeCard]}>
      <Text style={styles.cardTitle}>Recharge interne</Text>
      <Text style={styles.cardText}>Scannez le QR, lisez la carte NFC ou entrez l’ID du client, puis confirmez le montant.</Text>

      <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={scan}>
        <Ionicons name="qr-code-outline" size={22} color={TAKO_BLUE} />
        <Text style={styles.secondaryButtonText}>Scanner le QR client</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.nfcButton} activeOpacity={0.9} disabled={nfcLoading} onPress={readNfc}>
        {nfcLoading ? <ActivityIndicator color={TAKO_BLUE} /> : <MaterialCommunityIcons name="nfc" size={23} color={TAKO_BLUE} />}
        <Text style={styles.secondaryButtonText}>{nfcLoading ? 'Lecture NFC...' : 'Lire carte NFC'}</Text>
      </TouchableOpacity>

      {!!cardId && (
        <View style={styles.cardReadBox}>
          <MaterialCommunityIcons name="credit-card-check" size={20} color={TAKO_GREEN} />
          <Text style={styles.cardReadText}>Carte lue : {cardId}</Text>
        </View>
      )}

      <View style={styles.inputBox}>
        <Ionicons name="finger-print" size={24} color="#7B8798" />
        <TextInput
          placeholder="ID client"
          placeholderTextColor="#8B95A5"
          value={clientId}
          onChangeText={(value) => {
            setClientId(value);
            if (value.trim()) {
              clearCardId();
            }
          }}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>

      <View style={styles.inputBox}>
        <Text style={styles.currencyLabel}>FC</Text>
        <TextInput
          placeholder="Montant"
          placeholderTextColor="#8B95A5"
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>

      {feedback ? (
        <View style={[styles.feedbackBox, feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
          <Ionicons
            name={feedback.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            size={20}
            color={feedback.type === 'error' ? '#B42318' : '#087B35'}
          />
          <Text style={[styles.feedbackText, feedback.type === 'error' ? styles.feedbackErrorText : styles.feedbackSuccessText]}>
            {feedback.message}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.successButton} activeOpacity={0.9} disabled={loading} onPress={confirm}>
        {loading ? <ActivityIndicator color="white" /> : <Ionicons name="checkmark-circle" size={22} color="white" />}
        <Text style={styles.primaryButtonText}>Confirmer la recharge</Text>
      </TouchableOpacity>
    </View>
  );
}

function AgentRechargeCard({
  agentId,
  setAgentId,
  amount,
  setAmount,
  loading,
  confirm,
  lookupLoading,
  lookup,
  feedback,
}: {
  agentId: string;
  setAgentId: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  loading: boolean;
  confirm: () => void;
  lookupLoading: boolean;
  lookup: () => void;
  feedback: { type: 'success' | 'error'; message: string } | null;
}) {
  return (
    <View style={[styles.card, styles.internalRechargeCard]}>
      <Text style={styles.cardTitle}>Créditer un agent</Text>
      <Text style={styles.cardText}>
        Envoyez un solde à l’agent. Chaque recharge client débitera ce solde, puis l’agent remettra l’espèce en fin de journée.
      </Text>

      <View style={styles.inputBox}>
        <Ionicons name="person-circle-outline" size={24} color="#7B8798" />
        <TextInput
          placeholder="ID agent"
          placeholderTextColor="#8B95A5"
          value={agentId}
          onChangeText={setAgentId}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>

      <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} disabled={lookupLoading} onPress={lookup}>
        {lookupLoading ? <ActivityIndicator color={TAKO_BLUE} /> : <Ionicons name="analytics-outline" size={22} color={TAKO_BLUE} />}
        <Text style={styles.secondaryButtonText}>Suivre le compte agent</Text>
      </TouchableOpacity>

      {feedback ? (
        <View style={[styles.feedbackBox, feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
          <Ionicons
            name={feedback.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            size={20}
            color={feedback.type === 'error' ? '#B42318' : '#087B35'}
          />
          <Text style={[styles.feedbackText, feedback.type === 'error' ? styles.feedbackErrorText : styles.feedbackSuccessText]}>
            {feedback.message}
          </Text>
        </View>
      ) : null}

      <View style={styles.inputBox}>
        <Text style={styles.currencyLabel}>FC</Text>
        <TextInput
          placeholder="Montant à envoyer"
          placeholderTextColor="#8B95A5"
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>

      <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} disabled={loading} onPress={confirm}>
        {loading ? <ActivityIndicator color="white" /> : <Ionicons name="wallet-outline" size={22} color="white" />}
        <Text style={styles.primaryButtonText}>Envoyer au compte agent</Text>
      </TouchableOpacity>
    </View>
  );
}

function PrepaidCardActivationCard({
  phone,
  setPhone,
  code,
  setCode,
  cardId,
  readNfc,
  nfcLoading,
  loading,
  sendCode,
  confirm,
  feedback,
}: {
  phone: string;
  setPhone: (value: string) => void;
  code: string;
  setCode: (value: string) => void;
  cardId: string;
  readNfc: () => void;
  nfcLoading: boolean;
  loading: boolean;
  sendCode: () => void;
  confirm: () => void;
  feedback: { type: 'success' | 'error'; message: string } | null;
}) {
  return (
    <View style={[styles.card, styles.prepaidCard]}>
      <Text style={styles.cardTitle}>Carte prépayée</Text>
      <Text style={styles.cardText}>
        Pour un client sans smartphone : lisez une carte NFC vierge, confirmez son numéro par code, puis activez la carte.
      </Text>

      <TouchableOpacity style={styles.nfcButton} activeOpacity={0.9} disabled={nfcLoading} onPress={readNfc}>
        {nfcLoading ? <ActivityIndicator color={TAKO_BLUE} /> : <MaterialCommunityIcons name="nfc" size={23} color={TAKO_BLUE} />}
        <Text style={styles.secondaryButtonText}>{nfcLoading ? 'Lecture NFC...' : 'Lire carte vierge NFC'}</Text>
      </TouchableOpacity>

      {!!cardId && (
        <View style={styles.cardReadBox}>
          <MaterialCommunityIcons name="credit-card-check" size={20} color={TAKO_GREEN} />
          <Text style={styles.cardReadText}>Carte vierge lue : {cardId}</Text>
        </View>
      )}

      <View style={styles.inputBox}>
        <Ionicons name="call-outline" size={24} color="#7B8798" />
        <TextInput
          placeholder="Numéro de téléphone"
          placeholderTextColor="#8B95A5"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />
      </View>

      <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} disabled={loading} onPress={sendCode}>
        {loading ? <ActivityIndicator color={TAKO_BLUE} /> : <Ionicons name="send-outline" size={22} color={TAKO_BLUE} />}
        <Text style={styles.secondaryButtonText}>Envoyer le code</Text>
      </TouchableOpacity>

      <View style={styles.inputBox}>
        <Ionicons name="keypad-outline" size={24} color="#7B8798" />
        <TextInput
          placeholder="Code reçu"
          placeholderTextColor="#8B95A5"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>

      {feedback ? (
        <View style={[styles.feedbackBox, feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
          <Ionicons
            name={feedback.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            size={20}
            color={feedback.type === 'error' ? '#B42318' : '#087B35'}
          />
          <Text style={[styles.feedbackText, feedback.type === 'error' ? styles.feedbackErrorText : styles.feedbackSuccessText]}>
            {feedback.message}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.successButton} activeOpacity={0.9} disabled={loading} onPress={confirm}>
        {loading ? <ActivityIndicator color="white" /> : <Ionicons name="checkmark-circle" size={22} color="white" />}
        <Text style={styles.primaryButtonText}>Activer la carte</Text>
      </TouchableOpacity>
    </View>
  );
}

function AgentAccountCard({ agent, stats }: { agent: any; stats: any }) {
  const displayBalance = Number(agent?.balance || 0);
  const lastActivity = stats?.lastActivity ? formatDate(stats.lastActivity) : 'Aucune activité';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.cardTitle}>Suivi compte agent</Text>
          <Text style={styles.cardText}>Consultez le solde et l’activité de l’agent en temps réel.</Text>
        </View>
        <View style={styles.clientPill}>
          <Ionicons name="radio-outline" size={16} color={TAKO_BLUE} />
          <Text style={styles.clientPillText}>Instantané</Text>
        </View>
      </View>

      {!agent ? (
        <EmptyState icon="person-circle-outline" title="Aucun agent sélectionné" text="Entrez l’ID agent puis cliquez sur suivre." />
      ) : (
        <View style={styles.detailsGrid}>
          <InfoItem icon="person-outline" label="Agent" value={agent.fullName || 'Agent TaKo'} />
          <InfoItem icon="finger-print-outline" label="ID agent" value={agent.id} />
          <InfoItem icon="shield-checkmark-outline" label="Statut" value={agent.status === 'active' ? 'Actif' : 'En attente'} />
          <InfoItem icon="wallet-outline" label="Solde agent" value={`${displayBalance} FC`} />
          <InfoItem icon="swap-horizontal-outline" label="Transactions" value={`${stats?.transactionCount || 0}`} />
          <InfoItem icon="time-outline" label="Dernière activité" value={lastActivity} />
        </View>
      )}
    </View>
  );
}

function ClientDetails({
  client,
  balance,
  trips,
  notifications,
  updating,
  updateClient,
}: {
  client: any;
  balance: number;
  trips: number;
  notifications: number;
  updating: boolean;
  updateClient: (client: { fullName: string; email: string; phone: string; birthDate: string }) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');

  useEffect(() => {
    setFullName(client?.fullName || '');
    setEmail(client?.email || '');
    setPhone(client?.phone || '');
    setBirthDate(client?.birthDate || '');
  }, [client?.id, client?.fullName, client?.email, client?.phone, client?.birthDate]);

  if (!client) {
    return (
      <View style={[styles.card, styles.fullCard]}>
        <EmptyState icon="id-card-outline" title="Aucun client sélectionné" text="Entrez l’ID du client puis cliquez sur voir le compte client." />
      </View>
    );
  }

  const displayedBalance = Number(client?.balance ?? balance ?? 0);
  const save = () => {
    const cleanFullName = fullName.trim();
    const cleanBirthDate = birthDate.trim();

    if (!cleanFullName || !cleanBirthDate) {
      Alert.alert('Informations obligatoires', 'Le nom complet et la date de naissance sont obligatoires.');
      return;
    }

    Alert.alert(
      'Confirmer la modification',
      'Voulez-vous mettre à jour les informations de ce client ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Mettre à jour',
          onPress: () =>
            updateClient({
              fullName: cleanFullName,
              email: email.trim(),
              phone: phone.trim(),
              birthDate: cleanBirthDate,
            }),
        },
      ],
    );
  };

  return (
    <View style={[styles.card, styles.fullCard]}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.cardTitle}>Fiche client</Text>
          <Text style={styles.cardText}>Données principales et statut du compte.</Text>
        </View>
        <View style={styles.clientPill}>
          <Ionicons name="finger-print" size={18} color={TAKO_BLUE} />
          <Text style={styles.clientPillText}>{client?.id || '1000000001'}</Text>
        </View>
      </View>

      <View style={styles.detailsGrid}>
        <EditableInfoItem icon="person-outline" label="Nom complet" value={fullName} setValue={setFullName} />
        <EditableInfoItem icon="mail-outline" label="Email" value={email} setValue={setEmail} keyboardType="email-address" />
        <EditableInfoItem icon="call-outline" label="Téléphone" value={phone} setValue={setPhone} keyboardType="phone-pad" />
        <EditableInfoItem icon="calendar-outline" label="Date de naissance" value={birthDate} setValue={setBirthDate} placeholder="JJ/MM/AAAA" />
        <InfoItem icon="wallet-outline" label="Solde" value={`${displayedBalance} FC`} />
        <InfoItem icon="bus-outline" label="Trajets" value={`${trips}`} />
        <InfoItem icon="notifications-outline" label="Notifications" value={`${notifications}`} />
      </View>

      <TouchableOpacity style={styles.successButton} activeOpacity={0.9} disabled={updating} onPress={save}>
        {updating ? <ActivityIndicator color="white" /> : <Ionicons name="save-outline" size={22} color="white" />}
        <Text style={styles.primaryButtonText}>Mettre à jour</Text>
      </TouchableOpacity>

      <View style={styles.lockedBox}>
        <Ionicons name="lock-closed-outline" size={21} color={TAKO_BLUE} />
        <Text style={styles.lockedText}>ID permanent : non modifiable. Les autres informations verrouillées côté client peuvent être modifiées ici.</Text>
      </View>
    </View>
  );
}

function DriverCard({ driverStatus, approve }: { driverStatus: 'En attente' | 'Actif'; approve: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Validation chauffeur</Text>
      <View style={styles.infoRow}>
        <Ionicons name="person-circle-outline" size={24} color={TAKO_ACTION} />
        <Text style={styles.infoText}>Nom : John</Text>
      </View>
      <View style={styles.infoRow}>
        <MaterialCommunityIcons name="timer-sand" size={24} color={TAKO_ACTION} />
        <Text style={styles.infoText}>Statut : {driverStatus}</Text>
      </View>

      {driverStatus === 'En attente' ? (
        <TouchableOpacity style={styles.successButton} activeOpacity={0.9} onPress={approve}>
          <Ionicons name="checkmark-circle" size={22} color="white" />
          <Text style={styles.primaryButtonText}>Valider le chauffeur</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.activeState}>
          <Ionicons name="checkmark-circle" size={23} color={TAKO_GREEN} />
          <Text style={styles.activeText}>Chauffeur actif</Text>
        </View>
      )}
    </View>
  );
}

function OperationsCard({ route, bus, amount }: { route?: string; bus?: string; amount?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Exploitation transport</Text>
      <InfoItem icon="map-outline" label="Trajet courant" value={route || 'Non configuré'} />
      <InfoItem icon="bus-outline" label="Plaque bus" value={bus || 'Non configurée'} />
      <InfoItem icon="cash-outline" label="Montant" value={amount ? `${amount} FC` : 'Non configuré'} />
    </View>
  );
}

function TransactionSummary({ qr, nfc, recharge }: { qr: number; nfc: number; recharge: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Canaux de paiement</Text>
      <ChannelRow icon="qr-code-outline" label="Paiement QR" value={qr} />
      <ChannelRow icon="phone-portrait-outline" label="Paiement NFC" value={nfc} />
      <ChannelRow icon="card-outline" label="Recharges" value={recharge} />
    </View>
  );
}

function ChannelRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number }) {
  return (
    <View style={styles.channelRow}>
      <View style={styles.channelLeft}>
        <Ionicons name={icon} size={22} color={TAKO_ACTION} />
        <Text style={styles.infoText}>{label}</Text>
      </View>
      <Text style={styles.channelValue}>{value}</Text>
    </View>
  );
}

function TransactionRow({ item }: { item: TransactionNotification }) {
  const icon = item.type === 'nfc' ? 'phone-portrait-outline' : item.type === 'recharge' ? 'card-outline' : 'qr-code-outline';

  return (
    <View style={styles.transactionRow}>
      <View style={styles.transactionIcon}>
        <Ionicons name={icon} size={20} color={TAKO_BLUE} />
      </View>
      <View style={styles.transactionBody}>
        <Text style={styles.transactionTitle}>{item.title}</Text>
        <Text style={styles.transactionMessage}>{item.message}</Text>
      </View>
      <View style={styles.transactionMeta}>
        <Text style={styles.transactionAmount}>{item.amount} FC</Text>
        <Text style={styles.transactionDate}>{formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );
}

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={styles.checkRow}>
      <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done ? TAKO_GREEN : '#9AA6B2'} />
      <Text style={styles.infoText}>{label}</Text>
    </View>
  );
}

function EmptyState({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={44} color={TAKO_ACTION} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function EditableInfoItem({
  icon,
  label,
  value,
  setValue,
  keyboardType = 'default',
  placeholder,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  setValue: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  placeholder?: string;
}) {
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon} size={22} color={TAKO_ACTION} />
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={placeholder || 'Non renseigné'}
          placeholderTextColor="#8B95A5"
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          style={styles.detailInput}
        />
      </View>
    </View>
  );
}

function InfoItem({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon} size={22} color={TAKO_ACTION} />
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: PAGE_BG,
    ...(
      Platform.OS === 'web'
        ? ({ userSelect: 'none', overflowX: 'hidden', maxWidth: '100vw' } as any)
        : {}
    ),
  },
  shell: {
    flex: 1,
    flexDirection: 'row',
    ...(Platform.OS === 'web' ? ({ overflowX: 'hidden', maxWidth: '100%' } as any) : {}),
  },
  contentScroller: {
    flex: 1,
    ...(Platform.OS === 'web' ? ({ overflowX: 'hidden', maxWidth: '100%' } as any) : {}),
  },
  mobileShell: {
    flexDirection: 'column',
  },
  sidebar: {
    width: 250,
    backgroundColor: TAKO_BLUE,
    paddingHorizontal: 20,
    paddingTop: 34,
    paddingBottom: 24,
  },
  mobileSidebar: {
    width: '100%',
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 14,
  },
  brandBlock: {
    marginBottom: 24,
  },
  brandSubtitle: {
    color: '#BFE4FF',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 8,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  navList: {
    gap: 4,
  },
  navScroller: {
    flex: 1,
  },
  mobileNavList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  navItem: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  mobileNavItem: {
    width: '48%',
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  navItemActive: {
    backgroundColor: 'white',
  },
  navText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '900',
  },
  navTextActive: {
    color: TAKO_BLUE,
  },
  privateBox: {
    marginTop: 'auto',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  mobileHidden: {
    display: 'none',
  },
  privateTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  privateText: {
    color: '#BFE4FF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 6,
  },
  sidebarLogout: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    marginTop: 14,
  },
  mobileSidebarLogout: {
    alignSelf: 'stretch',
    marginTop: 10,
  },
  sidebarLogoutText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
  },
  content: {
    flexGrow: 1,
    padding: 34,
  },
  mobileContent: {
    width: '100%',
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 20,
    marginBottom: 24,
    zIndex: 20,
  },
  mobileTopBar: {
    flexDirection: 'column',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
    zIndex: 30,
  },
  mobileTopActions: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  kicker: {
    color: TAKO_ACTION,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: TAKO_BLUE,
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    color: '#5C667A',
    fontSize: 15,
    fontWeight: '700',
  },
  adminBadge: {
    minWidth: 0,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  adminAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TAKO_BLUE,
  },
  adminName: {
    color: TAKO_BLUE,
    fontSize: 14,
    fontWeight: '900',
  },
  adminEmail: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  adminMenu: {
    position: 'absolute',
    top: 66,
    right: 0,
    width: 245,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E1E7F0',
    backgroundColor: 'white',
    paddingVertical: 8,
    shadowColor: '#102A56',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 12,
  },
  adminMenuItem: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  adminMenuText: {
    color: '#17213B',
    fontSize: 13,
    fontWeight: '800',
  },
  adminMenuDivider: {
    height: 1,
    backgroundColor: '#E8EDF4',
    marginVertical: 6,
  },
  adminMenuLogout: {
    color: '#D64545',
    fontSize: 13,
    fontWeight: '900',
  },
  logoutButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: TAKO_BLUE,
    paddingHorizontal: 16,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 18,
  },
  dashboardToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    marginBottom: 18,
  },
  periodFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D7E0EF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  periodButtonActive: {
    borderColor: TAKO_BLUE,
    backgroundColor: TAKO_BLUE,
  },
  periodButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  dashboardLoader: {
    marginVertical: 36,
  },
  dashboardCharts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginBottom: 18,
  },
  dashboardChartCard: {
    minWidth: 260,
    flex: 1,
  },
  dashboardChartWide: {
    minWidth: 440,
    flexGrow: 2,
    flexBasis: 420,
  },
  dashboardActivityCard: {
    minWidth: 280,
    flex: 1,
  },
  activityRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  activityIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#EAF3FF',
  },
  activityBody: {
    flex: 1,
  },
  activityMessage: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  activityDate: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 3,
  },
  dashboardRecentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginBottom: 20,
  },
  recentTableCard: {
    minWidth: 440,
    flex: 1,
    padding: 0,
    overflow: 'hidden',
  },
  recentTableTitleRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  moreLink: {
    color: TAKO_ACTION,
    fontSize: 11,
    fontWeight: '900',
  },
  recentHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
  },
  recentHeaderCell: {
    flex: 1,
    color: '#475569',
    fontSize: 10,
    fontWeight: '900',
  },
  recentRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    paddingHorizontal: 14,
  },
  recentCell: {
    flex: 1,
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
  },
  recentStatus: {
    flex: 1,
    color: '#087B35',
    fontSize: 10,
    fontWeight: '900',
  },
  recentEmpty: {
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutChart: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 75,
    borderWidth: 30,
    borderColor: TAKO_GREEN,
    borderTopColor: TAKO_ACTION,
    borderRightColor: '#FFC35C',
    marginVertical: 20,
  },
  donutCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutValue: {
    color: TAKO_BLUE,
    fontSize: 20,
    fontWeight: '900',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  legendBlue: {
    color: TAKO_ACTION,
    fontSize: 11,
    fontWeight: '800',
  },
  legendGreen: {
    color: TAKO_GREEN,
    fontSize: 11,
    fontWeight: '800',
  },
  legendOrange: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '800',
  },
  lineChart: {
    minHeight: 190,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE5F2',
    marginTop: 24,
    paddingHorizontal: 12,
  },
  linePoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: TAKO_ACTION,
  },
  statusPanels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginBottom: 20,
  },
  statusPanel: {
    flexBasis: 220,
  },
  statusLine: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  statusLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
  },
  statusSuccess: {
    color: '#087B35',
    fontWeight: '900',
  },
  statusPending: {
    color: '#B45309',
    fontWeight: '900',
  },
  statusFailed: {
    color: '#B91C1C',
    fontWeight: '900',
  },
  alertPanel: {
    flexBasis: 300,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    padding: 12,
    marginTop: 10,
  },
  alertText: {
    flex: 1,
    color: '#92400E',
    fontSize: 13,
    fontWeight: '800',
  },
  mobileStatsGrid: {
    flexDirection: 'column',
  },
  statCard: {
    minWidth: 180,
    flexGrow: 1,
    flexBasis: '18%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: 'white',
    padding: 18,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  statIconGreen: {
    backgroundColor: '#E9FFF1',
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  statValue: {
    color: TAKO_BLUE,
    fontSize: 24,
    fontWeight: '900',
  },
  statComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 9,
  },
  statChange: {
    color: '#087B35',
    fontSize: 11,
    fontWeight: '900',
  },
  statChangeNegative: {
    color: '#B91C1C',
  },
  statComparisonLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  referencePage: {
    gap: 18,
  },
  clientDirectory: {
    gap: 18,
  },
  directoryTableScroller: {
    ...(
      Platform.OS === 'web'
        ? ({ overflowX: 'auto', overflowY: 'hidden' } as any)
        : { overflow: 'hidden' as const }
    ),
  },
  clientStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  clientStat: {
    minWidth: 210,
    flexGrow: 1,
    flexBasis: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  clientStatIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#F1F5FF',
  },
  clientStatLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
  clientStatValue: {
    color: '#111827',
    fontSize: 23,
    fontWeight: '900',
    marginVertical: 3,
  },
  clientSubtext: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  clientFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  clientSearchBox: {
    minWidth: 320,
    minHeight: 44,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    paddingHorizontal: 13,
  },
  clientSearchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
  },
  filterChoices: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    paddingHorizontal: 11,
  },
  filterChipActive: {
    borderColor: TAKO_BLUE,
    backgroundColor: TAKO_BLUE,
  },
  filterChipText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  clientTable: {
    minWidth: 1320,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  driverTable: {
    minWidth: 1500,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  agentTable: {
    minWidth: 1500,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  driverTableCell: {
    width: 145,
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    paddingRight: 10,
  },
  clientTableRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
    paddingHorizontal: 14,
  },
  clientTableHeader: {
    minHeight: 48,
    backgroundColor: '#F8FAFC',
  },
  clientTableCell: {
    width: 145,
    paddingRight: 10,
  },
  clientTableHeaderText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '900',
  },
  clientTableCellText: {
    width: 145,
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    paddingRight: 10,
  },
  clientName: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '900',
  },
  clientBalance: {
    width: 145,
    color: TAKO_BLUE,
    fontSize: 12,
    fontWeight: '900',
    paddingRight: 10,
  },
  statusActive: {
    alignSelf: 'flex-start',
    color: '#087B35',
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: '#E9FFF1',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  statusInactive: {
    alignSelf: 'flex-start',
    color: '#B45309',
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: '#FFF7ED',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  statusBlocked: {
    alignSelf: 'flex-start',
    color: '#B91C1C',
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: '#FEF2F2',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  clientActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clientActionButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    backgroundColor: '#F8FAFC',
  },
  clientTableLoading: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientPagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paginationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
  },
  pageCurrent: {
    color: TAKO_BLUE,
    fontSize: 12,
    fontWeight: '900',
  },
  clientProfilePanel: {
    marginTop: 20,
  },
  cardManager: {
    marginTop: 20,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 31, 104, 0.55)',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 760,
  },
  confirmModal: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 28,
  },
  confirmIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    marginBottom: 16,
  },
  creditIcon: {
    backgroundColor: '#E9FFF1',
  },
  creditAmountInput: {
    width: '100%',
    minHeight: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 14,
    marginTop: 20,
  },
  creditConfirmButton: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#087B35',
  },
  confirmTitle: {
    color: '#111827',
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  confirmText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
  },
  modalInput: {
    width: '100%',
    minHeight: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 14,
    marginTop: 14,
  },
  confirmActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  confirmNo: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
  },
  confirmNoText: {
    color: TAKO_BLUE,
    fontSize: 13,
    fontWeight: '900',
  },
  confirmYes: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#DC2626',
  },
  confirmYesText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  profileModalCard: {
    width: '100%',
    maxWidth: 980,
    maxHeight: '90%',
    borderRadius: 10,
    backgroundColor: PAGE_BG,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  profileModalScroll: {
    flexGrow: 0,
  },
  driverDetails: {
    gap: 18,
    paddingBottom: 12,
  },
  driverProfileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  driverAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF3FF',
  },
  driverFormGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  driverFormField: {
    minWidth: 260,
    flexGrow: 1,
    flexBasis: '45%',
    gap: 7,
  },
  driverInput: {
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
    color: '#111827',
    paddingHorizontal: 12,
  },
  driverDetailActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  agentFilterInputs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  agentFilterInput: {
    minWidth: 150,
    minHeight: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    color: '#111827',
    paddingHorizontal: 10,
    fontSize: 11,
  },
  agentRoleBadge: {
    alignSelf: 'flex-start',
    color: '#0369A1',
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: '#E0F2FE',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  cardManagerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },
  cardManagerInput: {
    minWidth: 280,
    minHeight: 42,
    flexGrow: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    color: '#111827',
    paddingHorizontal: 13,
  },
  secondaryAction: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: TAKO_BLUE,
    paddingHorizontal: 15,
  },
  secondaryActionText: {
    color: TAKO_BLUE,
    fontSize: 12,
    fontWeight: '900',
  },
  referenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  referenceTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 5,
  },
  referencePrimary: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 6,
    backgroundColor: TAKO_BLUE,
    paddingHorizontal: 16,
  },
  referencePrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  referenceSearch: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  referencePlaceholder: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  referenceTable: {
    overflow: 'hidden',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
  },
  referenceTableHeader: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE5F2',
    paddingHorizontal: 16,
  },
  referenceHeaderCell: {
    flex: 1,
    color: '#334155',
    fontSize: 12,
    fontWeight: '900',
  },
  referenceEmpty: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  treasuryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  miniMetric: {
    minWidth: 180,
    flexGrow: 1,
    flexBasis: 0,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  miniMetricLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  miniMetricValue: {
    color: TAKO_BLUE,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 8,
  },
  miniMetricStatus: {
    color: '#087B35',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
  },
  reportMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  chartCard: {
    minHeight: 300,
  },
  chartPlaceholder: {
    minHeight: 210,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE5F2',
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  chartBar: {
    width: 24,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: TAKO_ACTION,
  },
  notificationComposer: {
    maxWidth: 720,
  },
  formLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 18,
    marginBottom: 8,
  },
  channelChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  channelChoice: {
    minWidth: 130,
    alignItems: 'center',
    gap: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    padding: 14,
  },
  channelChoiceActive: {
    borderColor: TAKO_BLUE,
    backgroundColor: '#EAF3FF',
  },
  channelChoiceText: {
    color: TAKO_BLUE,
    fontSize: 12,
    fontWeight: '800',
  },
  messageInput: {
    minHeight: 150,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    color: '#111827',
    padding: 14,
    textAlignVertical: 'top',
    marginBottom: 18,
  },
  moduleGrid: {
    marginTop: 4,
  },
  moduleIntro: {
    flexBasis: '100%',
    borderTopWidth: 4,
    borderTopColor: TAKO_ACTION,
  },
  moduleTitle: {
    color: TAKO_BLUE,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  moduleAction: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  moduleActionText: {
    color: TAKO_BLUE,
    fontSize: 14,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    alignItems: 'stretch',
  },
  mobileGrid: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    gap: 14,
  },
  card: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    minWidth: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: 'white',
    padding: 22,
  },
  searchCard: {
    borderTopWidth: 4,
    borderTopColor: TAKO_ACTION,
  },
  internalRechargeCard: {
    borderTopWidth: 4,
    borderTopColor: TAKO_GREEN,
  },
  prepaidCard: {
    borderTopWidth: 4,
    borderTopColor: TAKO_ACTION,
  },
  fullCard: {
    flexBasis: '100%',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 18,
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    color: TAKO_BLUE,
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 8,
  },
  cardText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 18,
  },
  inputBox: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCD6E3',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  input: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  primaryButton: {
    height: 56,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: TAKO_BLUE,
  },
  secondaryButton: {
    height: 52,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDFFF',
    backgroundColor: '#EAF3FF',
    marginBottom: 14,
  },
  secondaryButtonText: {
    color: TAKO_BLUE,
    fontSize: 15,
    fontWeight: '900',
  },
  nfcButton: {
    height: 52,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDFFF',
    backgroundColor: '#F6FAFF',
    marginBottom: 14,
  },
  cardReadBox: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAF0C8',
    backgroundColor: '#E9FFF1',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
  },
  cardReadText: {
    flex: 1,
    color: '#087B35',
    fontSize: 13,
    fontWeight: '900',
  },
  pendingRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
    paddingVertical: 10,
  },
  pendingIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingInfo: {
    flex: 1,
  },
  pendingName: {
    color: TAKO_BLUE,
    fontSize: 15,
    fontWeight: '900',
  },
  pendingMeta: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  pendingButton: {
    minWidth: 88,
    height: 42,
    borderRadius: 8,
    backgroundColor: TAKO_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  pendingButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
  },
  currencyLabel: {
    color: TAKO_BLUE,
    fontSize: 17,
    fontWeight: '900',
  },
  successButton: {
    height: 56,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: TAKO_GREEN,
    marginTop: 18,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  infoText: {
    color: '#263247',
    fontSize: 15,
    fontWeight: '800',
  },
  activeState: {
    height: 56,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E9FFF1',
    marginTop: 18,
  },
  activeText: {
    color: '#087B35',
    fontSize: 16,
    fontWeight: '900',
  },
  feedbackBox: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },
  feedbackSuccess: {
    backgroundColor: '#E9FFF1',
    borderWidth: 1,
    borderColor: '#BAF0C8',
  },
  feedbackError: {
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: '#FFCDC9',
  },
  feedbackText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
  },
  feedbackSuccessText: {
    color: '#087B35',
  },
  feedbackErrorText: {
    color: '#B42318',
  },
  clientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: '#EAF3FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clientPillText: {
    color: TAKO_BLUE,
    fontSize: 13,
    fontWeight: '900',
  },
  detailsGrid: {
    flexDirection: 'column',
    gap: 14,
    marginTop: 12,
  },
  detailItem: {
    minWidth: 0,
    flexGrow: 1,
    flexBasis: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    backgroundColor: '#F6F9FE',
    padding: 14,
  },
  detailTextWrap: {
    flex: 1,
  },
  detailLabel: {
    color: '#7B8798',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  detailValue: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '900',
  },
  detailInput: {
    minHeight: 34,
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '900',
    borderBottomWidth: 1,
    borderBottomColor: '#D7E0EF',
    paddingVertical: 4,
  },
  lockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    backgroundColor: '#EAF3FF',
    padding: 14,
    marginTop: 18,
  },
  lockedText: {
    flex: 1,
    color: TAKO_BLUE,
    fontSize: 14,
    fontWeight: '900',
  },
  channelRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  channelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  channelValue: {
    color: TAKO_BLUE,
    fontSize: 18,
    fontWeight: '900',
  },
  transactionRow: {
    minHeight: 74,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
    paddingVertical: 12,
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionBody: {
    flex: 1,
  },
  transactionTitle: {
    color: TAKO_BLUE,
    fontSize: 15,
    fontWeight: '900',
  },
  transactionMessage: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  transactionMeta: {
    alignItems: 'flex-start',
    marginLeft: 0,
  },
  transactionAmount: {
    color: TAKO_GREEN,
    fontSize: 15,
    fontWeight: '900',
  },
  transactionDate: {
    color: '#8B95A5',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  checkRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyState: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F6F9FE',
    padding: 22,
  },
  emptyTitle: {
    color: TAKO_BLUE,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
});
