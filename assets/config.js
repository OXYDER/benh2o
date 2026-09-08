/**
 * CONFIGURATION — benoitlaprise.com
 * ----------------------------------
 * Modifie seulement ce fichier pour mettre le site à jour.
 * Aucune connaissance en programmation requise pour cette partie :
 * remplace le texte entre guillemets " " par tes vraies informations.
 */
window.BL_CONFIG = {

  // Coordonnées principales
  nom: "Benoît Laprise",
  titre: "Représentant des ventes — Division Érablière, H2O Innovation",

  telephoneAffiche: "819 000-0000",       // ce qui s'affiche à l'écran
  telephoneLien: "+18190000000",           // format international pour les liens tel:/sms:
  courriel: "benoit.laprise@h2oinnovation.com",

  // Facebook Messenger — remplace par ton nom d'utilisateur de page Facebook
  // Exemple : si ta page est facebook.com/H2OInnovationErable, mets "H2OInnovationErable"
  messengerUsername: "TonNomDePageFacebook",

  // Chat en direct (Tawk.to — gratuit, compte à créer sur tawk.to)
  // Une fois ton compte créé, copie ton "Property ID" et ton "Widget ID" ici.
  // Laisse tel quel (false) pour désactiver le chat en direct en attendant.
  tawkTo: {
    actif: false,
    propertyId: "000000000000000000000000",
    widgetId: "1abcdefgh"
  },

  // Formulaire de contact — utilise formsubmit.co (gratuit, sans serveur requis)
  // La première soumission demandera de confirmer l'adresse courriel ci-dessous.
  formsubmitEmail: "benoit.laprise@h2oinnovation.com",

  // Lien vers la boutique H2O Innovation
  boutiqueUrl: "https://h2oinnovation.net",

  /**
   * Zone géographique couverte.
   * Ajoute ou retire des villes / MRC selon ton territoire réel.
   * ⚠️ La liste ci-dessous est un EXEMPLE à remplacer par ton vrai secteur.
   */
  zones: [
    "Victoriaville",
    "Plessisville",
    "Warwick",
    "Princeville",
    "Thetford Mines",
    "MRC de l'Érable",
    "MRC des Appalaches",
    "MRC d'Arthabaska",
    "Beauceville",
    "Saint-Georges",
    "MRC de Beauce-Sartigan",
    "Sherbrooke",
    "MRC du Granit",
    "Lac-Mégantic"
  ],

  // Si une adresse ne correspond à aucune zone, on propose ce lien de repli
  contactGeneralUrl: "https://h2oinnovation.net/contact"
};
