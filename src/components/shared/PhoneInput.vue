<template>
  <div class="phone-input-wrap">
    <select
      :value="country"
      class="phone-input-select"
      @change="onCountryChange($event.target.value)"
    >
      <option value="KM">🇰🇲 +269</option>
      <option value="FR">🇫🇷 +33</option>
    </select>
    <input
      :value="phone"
      type="tel"
      inputmode="numeric"
      :maxlength="rules.length"
      class="phone-input-field"
      :placeholder="rules.placeholder"
      @input="onPhoneInput($event.target.value)"
    />
  </div>
  <p v-if="hint" class="phone-input-hint">
    {{ rules.length }} chiffres, sans le {{ rules.prefix }} — ajouté automatiquement.
  </p>
</template>

<script>
import { PHONE_RULES } from '@/utils/phone'

/**
 * Champ téléphone standard pour tout le projet (demande explicite) : un
 * sélecteur de pays (KM/FR) accolé au numéro local, jamais l'indicatif saisi
 * à la main. Reprend à l'identique le patron déjà en place dans
 * UserDetailPage.vue/MonComptePage.vue (client) — centralisé ici pour que
 * tout nouvel usage soit garanti identique, pas une copie qui pourrait
 * dériver. Double v-model : v-model:phone (numéro local, chiffres seulement)
 * et v-model:country ('KM'/'FR').
 */
export default {
  name: 'PhoneInput',
  props: {
    phone: { type: String, default: '' },
    country: { type: String, default: 'KM' },
    hint: { type: Boolean, default: true },
  },
  emits: ['update:phone', 'update:country'],
  computed: {
    rules() {
      return PHONE_RULES[this.country] || PHONE_RULES.KM
    },
  },
  methods: {
    // Changer de pays en cours de saisie : le reste tapé pour l'autre pays
    // serait invalide dans les deux cas, on vide plutôt que de laisser une
    // valeur tronquée trompeuse — même choix que UserDetailPage.vue.
    onCountryChange(value) {
      this.$emit('update:country', value)
      this.$emit('update:phone', '')
    },
    onPhoneInput(value) {
      this.$emit('update:phone', value.replace(/\D/g, '').slice(0, this.rules.length))
    },
  },
}
</script>

<style scoped>
.phone-input-wrap {
  display: flex;
  align-items: stretch;
}

.phone-input-select {
  flex-shrink: 0;
  padding: 0 0.5rem;
  border: 1px solid var(--color-border) !important;
  border-right: none !important;
  border-radius: 10px 0 0 10px !important;
  background: var(--color-hover-bg) !important;
  color: var(--color-text) !important;
  font-size: 0.86rem;
  outline: none;
  cursor: pointer;
  appearance: none;
}

.phone-input-select:focus {
  outline: none;
  border-color: var(--color-accent) !important;
}

.phone-input-field {
  flex: 1;
  min-width: 0;
  padding: 10px 13px;
  border: 1px solid var(--color-border) !important;
  border-radius: 0 10px 10px 0 !important;
  font-size: 0.88rem;
  color: var(--color-text);
  background: var(--color-surface) !important;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.phone-input-field:focus {
  border-color: var(--color-accent) !important;
  box-shadow: 0 0 0 3px rgba(26, 204, 141, 0.18);
}

.phone-input-hint {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  margin: 6px 0 0;
}
</style>
