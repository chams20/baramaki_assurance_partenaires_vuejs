/**
 * Règles de saisie téléphone — mêmes règles que PhoneFormatter côté back
 * (voir src/Service/Shared/PhoneFormatter.php) : KM = 7 chiffres locaux,
 * FR = 9 chiffres locaux sans le 0 initial. L'indicatif n'est jamais saisi à
 * la main, toujours ajouté/retiré automatiquement.
 *
 * Standard pour tout le projet (demande explicite) : un seul endroit pour
 * ces règles côté admin plutôt que dupliquées à chaque formulaire — voir
 * PhoneInput.vue qui les consomme. Seulement KM/FR pour l'instant ; étendre
 * cette liste est le seul endroit à toucher le jour où un troisième pays est
 * supporté.
 */
export const PHONE_RULES = {
  KM: { length: 7, regex: /^\d{7}$/, placeholder: '3475665', prefix: '+269' },
  FR: { length: 9, regex: /^\d{9}$/, placeholder: '612345678', prefix: '+33' },
}

/**
 * "+269 347 56 65" (déjà stocké formaté) → { country: 'KM', raw: '3475665' } ;
 * "+33 6 12 34 56 78" → { country: 'FR', raw: '612345678' }, pour repeupler
 * un champ d'édition avec ce qui doit être ressaisi. Pas de colonne "pays du
 * téléphone" séparée en base : le préfixe déjà stocké suffit à le déduire
 * (voir PhoneFormatter::detectCountry() côté back).
 */
export function parsePhone(phone) {
  if (!phone) return { country: 'KM', raw: '' }

  const digits = phone.replace(/\D/g, '')

  if (phone.trim().startsWith('+33')) {
    return { country: 'FR', raw: digits.length === 11 ? digits.slice(2) : digits }
  }

  return { country: 'KM', raw: digits.length === 10 && digits.startsWith('269') ? digits.slice(3) : digits }
}
