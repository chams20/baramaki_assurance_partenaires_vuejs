<template>
  <div class="gad-page">
    <header class="gad-header">
      <h1 class="gad-title"><i class="bi bi-journal-code"></i> Documentation de l'API d'adressage</h1>
      <p class="gad-subtitle">
        Référence pour interroger l'API de suggestion d'adresses comoriennes de BARAMAKI depuis votre propre
        site — tout se passe en HTTP, aucun SDK requis.
      </p>
    </header>

    <section class="gad-section">
      <h2 class="gad-section-title"><i class="bi bi-key"></i> Authentification</h2>
      <p class="gad-text">
        Chaque appel doit porter votre clé API dans l'en-tête <code>X-Api-Key</code> — jamais en
        paramètre d'URL (elle se retrouverait dans les journaux de serveurs intermédiaires). Une clé se
        génère depuis <router-link to="/cles-api">vos clés API</router-link> : elle n'est affichée qu'une
        seule fois à sa création — notez-la immédiatement, seule son empreinte (hash) reste ensuite en
        base, y compris pour nous.
      </p>
      <pre class="gad-code">X-Api-Key: bmk_live_a1b2c3d4e5f6...</pre>

      <div class="gad-note">
        <i class="bi bi-shield-check"></i>
        <span>
          Chaque clé est restreinte à <strong>un seul domaine</strong>, fixé à sa création (ex.
          <code>ylang-logistics.km</code>) — même principe qu'une clé Google Maps « restreinte par
          référent HTTP ». L'appel doit donc venir d'un <strong>navigateur</strong> sur ce domaine précis
          (l'en-tête <code>Origin</code>, ou à défaut <code>Referer</code>, envoyé automatiquement par le
          navigateur, est comparé au domaine enregistré) — un appel fait depuis un script
          serveur-à-serveur, sans navigateur, sera refusé.
        </span>
      </div>
    </section>

    <section class="gad-section">
      <h2 class="gad-section-title"><i class="bi bi-signpost-2"></i> Suggestion d'adresse</h2>
      <p class="gad-text">
        Un seul endpoint, qui couvre toute la hiérarchie d'adressage comorienne que BARAMAKI référence :
        préfectures, communes, villages, quartiers, lieux nommés (hôpitaux, banques...), rues et numéros.
      </p>

      <table class="gad-table">
        <tbody>
          <tr>
            <th>Méthode</th>
            <td><span class="gad-verb">GET</span> <code>/api/geo/suggest</code></td>
          </tr>
          <tr>
            <th>Paramètre</th>
            <td><code>q</code> — le texte tapé par votre utilisateur (2 caractères minimum, sinon une liste vide est renvoyée)</td>
          </tr>
          <tr>
            <th>En-tête requis</th>
            <td><code>X-Api-Key</code> — voir Authentification ci-dessus</td>
          </tr>
        </tbody>
      </table>

      <p class="gad-text gad-text--label">Exemple de requête</p>
      <pre class="gad-code">GET {{ apiBaseUrl }}/api/geo/suggest?q=fomboni
X-Api-Key: bmk_live_a1b2c3d4e5f6...</pre>

      <p class="gad-text gad-text--label">Exemple de réponse — <span class="gad-status gad-status--ok">200 OK</span></p>
      <pre class="gad-code">{{ exampleResponse }}</pre>

      <div class="gad-note">
        <i class="bi bi-info-circle"></i>
        <span>
          Les valeurs de cet exemple, et de ceux plus bas pour chaque type (noms, coordonnées), sont fictives
          — elles servent uniquement à montrer la forme exacte d'une réponse, pas à garantir qu'un lieu
          existe tel quel dans le référentiel à l'instant où vous lisez ceci.
        </span>
      </div>

      <p class="gad-text">
        <code>results</code> contient au plus 8 suggestions, classées par pertinence (préfixe du nom ou d'un
        alias d'abord, puis sous-chaîne — chercher <code>BDC</code> remonte ainsi une banque même si ce n'est
        pas sa raison sociale complète). <code>coordinates</code> vaut <code>null</code> quand rien n'est
        géolocalisé nulle part dans toute la chaîne (île → ... → résultat) — à prévoir côté intégration, la
        donnée d'adressage comorien se densifie progressivement, y compris pour un résultat déjà validé.
      </p>

      <p class="gad-text gad-text--label">Les 6 types de résultat possibles</p>
      <p class="gad-text">
        Chaque résultat porte toujours les mêmes champs, quel que soit son <code>type</code> — seuls certains
        sont renseignés (<code>null</code> sinon).
      </p>
      <table class="gad-table gad-table--types">
        <thead>
          <tr>
            <th>type</th>
            <th>Ce que c'est</th>
            <th>Champ(s) propre(s)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>commune</code></td>
            <td>Commune officielle</td>
            <td>—</td>
          </tr>
          <tr>
            <td><code>village</code></td>
            <td>Village, rattaché à une commune</td>
            <td>—</td>
          </tr>
          <tr>
            <td><code>neighborhood</code></td>
            <td>Quartier, rattaché à un village</td>
            <td>—</td>
          </tr>
          <tr>
            <td><code>place</code></td>
            <td>Lieu nommé — hôpital, banque, ambassade, école, marché, monument...</td>
            <td><code>category</code></td>
          </tr>
          <tr>
            <td><code>street</code></td>
            <td>Rue (rattachée à un quartier, ou à défaut un village)</td>
            <td>—</td>
          </tr>
          <tr>
            <td><code>street_number</code></td>
            <td>Numéro sur une rue — <code>name</code> combine déjà les deux ("12 Sowo Kapwa"),
              <code>street</code>/<code>number</code> existent en plus pour recomposer un formulaire avec un
              champ Rue et un champ Numéro séparés.</td>
            <td><code>street</code>, <code>number</code></td>
          </tr>
        </tbody>
      </table>

      <p class="gad-text gad-text--label">Un exemple pour chaque type</p>
      <details v-for="type in resultTypes" :key="type" class="gad-details">
        <summary class="gad-summary"><code>{{ type }}</code></summary>
        <pre class="gad-code">{{ typeExample(type) }}</pre>
      </details>

      <p class="gad-text gad-text--label">Intégration — JavaScript, depuis votre site</p>
      <pre class="gad-code">const response = await fetch(
  '{{ apiBaseUrl }}/api/geo/suggest?q=' + encodeURIComponent(query),
  { headers: { 'X-Api-Key': 'bmk_live_...' } }
)
const data = await response.json()

if (data.status === 'success') {
  data.results.forEach((result) => {
    // "name" est toujours le libellé lisible, quel que soit le type — le
    // reste des champs ne sert qu'à recomposer une adresse structurée.
    console.log(result.type, result.name, result.chain, result.coordinates)

    if (result.type === 'place') {
      console.log('catégorie :', result.category)
    }
    if (result.type === 'street_number') {
      console.log('rue seule :', result.street, '— numéro seul :', result.number)
    }
  })
}</pre>

      <p class="gad-text gad-text--label">Intégration — ligne de commande (cURL, pour tester rapidement)</p>
      <pre class="gad-code">curl "{{ apiBaseUrl }}/api/geo/suggest?q=fomboni" \
  -H "X-Api-Key: bmk_live_..." \
  -H "Origin: https://votre-domaine.km"</pre>
      <p class="gad-text">
        L'en-tête <code>Origin</code> est obligatoire ici — un navigateur l'envoie automatiquement à
        chaque appel (rien à faire de spécial côté JavaScript), mais <code>curl</code> ne l'envoie jamais
        tout seul : sans lui, ou avec un domaine différent de celui enregistré sur la clé, l'appel est
        refusé (401).
      </p>
    </section>

    <section class="gad-section">
      <h2 class="gad-section-title"><i class="bi bi-exclamation-octagon"></i> Codes d'erreur</h2>

      <table class="gad-table gad-table--errors">
        <thead>
          <tr>
            <th>Code</th>
            <th>Cause</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="gad-status gad-status--error">401</span></td>
            <td>Clé absente, invalide, révoquée ou expirée — ou le forfait qui la finance n'est plus actif.</td>
          </tr>
          <tr>
            <td><span class="gad-status gad-status--error">401</span></td>
            <td>
              Appel sans en-tête <code>Origin</code>/<code>Referer</code> (pas un navigateur), ou domaine
              différent de celui enregistré sur la clé.
            </td>
          </tr>
          <tr>
            <td><span class="gad-status gad-status--warn">429</span></td>
            <td>
              Quota mensuel du forfait dépassé — voir Quotas ci-dessous. La requête n'atteint même pas le
              moteur de suggestion.
            </td>
          </tr>
        </tbody>
      </table>

      <p class="gad-text">
        Chaque réponse d'erreur est un JSON <code>{ "status": "error", "message": "..." }</code>, avec un
        message en français directement affichable si besoin.
      </p>
    </section>

    <section class="gad-section">
      <h2 class="gad-section-title"><i class="bi bi-speedometer2"></i> Quotas</h2>
      <p class="gad-text">
        Chaque forfait porte un quota de requêtes par mois — mais un « mois » compte ici à partir du
        <strong>jour de renouvellement de votre souscription</strong>, pas du 1<sup>er</sup> du mois
        calendaire. Une souscription commencée le 12 voit donc son quota se réinitialiser le 12 de chaque
        mois suivant, jamais le 1<sup>er</sup> — la fenêtre reste toujours une vraie durée d'environ 30
        jours, quelle que soit la date d'inscription. Visible sur <router-link to="/cles-api">vos clés
        API</router-link>, qui affiche aussi le nombre d'appels déjà consommés sur la période en cours par
        clé. Un forfait sans quota (« illimité ») n'est jamais bloqué. Le quota se compte au niveau du
        <strong>forfait</strong>, pas de la clé : plusieurs clés d'un même forfait (une par domaine)
        partagent le même compteur.
      </p>
    </section>
  </div>
</template>

<script>
export default {
  name: 'GeoApiDocsPage',
  computed: {
    apiBaseUrl() {
      return import.meta.env.VITE_APP_BACK_API_URL || 'https://api.baramaki-assure.com'
    },
    exampleResponse() {
      return JSON.stringify(
        {
          status: 'success',
          query: 'fomboni',
          results: [this.typeExamples.commune],
        },
        null,
        2,
      )
    },
    resultTypes() {
      return Object.keys(this.typeExamples)
    },
    // Un exemple réel par type — capturé en interrogeant le vrai
    // GeoAddressSuggestionService (2026-08-25, uuid/photos rafraîchis le
    // 2026-08-26), pas inventé à la main : ce que ce document montre est
    // exactement ce qu'un partenaire reçoit.
    typeExamples() {
      return {
        commune: {
          type: 'commune',
          uuid: '7b8333c8-3f4a-4f2e-b12b-bd22bd09af0f',
          category: null,
          name: 'Fomboni',
          street: null,
          number: null,
          chain: 'Fomboni, Mohéli (Mwali)',
          island: 'Mohéli (Mwali)',
          region: 'Fomboni',
          commune: 'Fomboni',
          village: null,
          neighborhood: null,
          coordinates: { lat: -12.2822, lng: 43.7419 },
          photos: [],
        },
        village: {
          type: 'village',
          uuid: '2a547fff-fc9c-4647-b135-9bf6b7a7edff',
          category: null,
          name: 'Mvouni',
          street: null,
          number: null,
          chain: 'Bambao Ya Djou, Bambao, Ngazidja (Grande Comore)',
          island: 'Ngazidja (Grande Comore)',
          region: 'Bambao',
          commune: 'Bambao Ya Djou',
          village: 'Mvouni',
          neighborhood: null,
          coordinates: { lat: -11.7161, lng: 43.2647 },
          photos: [],
        },
        neighborhood: {
          type: 'neighborhood',
          uuid: '18282dbb-87ae-4c3a-aaaa-afbc0502a834',
          category: null,
          name: 'Mouzdalifa',
          street: null,
          number: null,
          chain: 'Mvouni, Bambao Ya Djou, Bambao, Ngazidja (Grande Comore)',
          island: 'Ngazidja (Grande Comore)',
          region: 'Bambao',
          commune: 'Bambao Ya Djou',
          village: 'Mvouni',
          neighborhood: 'Mouzdalifa',
          // Quartier sans coordonnées propres — replié sur celles de son
          // village (Mvouni), même mécanisme que pour une rue ou un numéro.
          coordinates: { lat: -11.7161, lng: 43.2647 },
          photos: [],
        },
        place: {
          type: 'place',
          uuid: 'ff008b8b-ca60-4ac4-a9d3-a7220f7d6091',
          category: 'hopital',
          name: 'Hôpital El-Maarouf',
          street: null,
          number: null,
          chain: 'Moroni, Bambao, Ngazidja (Grande Comore)',
          island: 'Ngazidja (Grande Comore)',
          region: 'Bambao',
          commune: 'Moroni',
          village: null,
          neighborhood: null,
          coordinates: { lat: -11.694722, lng: 43.254444 },
          photos: [],
        },
        street: {
          type: 'street',
          uuid: '1966944d-412e-49e0-9fc3-dc2158cd963a',
          category: null,
          name: 'Sowo Kapwa',
          street: null,
          number: null,
          chain: 'Ambassabena, Mvouni, Bambao Ya Djou, Bambao, Ngazidja (Grande Comore)',
          island: 'Ngazidja (Grande Comore)',
          region: 'Bambao',
          commune: 'Bambao Ya Djou',
          village: 'Mvouni',
          neighborhood: 'Ambassabena',
          coordinates: { lat: -11.7161, lng: 43.2647 },
          photos: [],
        },
        street_number: {
          type: 'street_number',
          uuid: '66a268c1-28e3-4cd4-a058-209b062a1c7c',
          category: null,
          name: '12 Sowo Kapwa',
          street: 'Sowo Kapwa',
          number: '12',
          chain: 'Ambassabena, Mvouni, Bambao Ya Djou, Bambao, Ngazidja (Grande Comore)',
          island: 'Ngazidja (Grande Comore)',
          region: 'Bambao',
          commune: 'Bambao Ya Djou',
          village: 'Mvouni',
          neighborhood: 'Ambassabena',
          coordinates: { lat: -11.7161, lng: 43.2647 },
          photos: [],
        },
      }
    },
  },
  methods: {
    typeExample(type) {
      return JSON.stringify(this.typeExamples[type], null, 2)
    },
  },
}
</script>

<style scoped>
.gad-page {
  padding: 24px;
  max-width: 780px;
  margin: 0 auto;
}

.gad-header {
  margin-bottom: 1.75rem;
}

.gad-title {
  font-family: 'Raleway', sans-serif;
  font-weight: 800;
  font-size: 1.35rem;
  color: var(--color-heading);
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0 0 0.5rem;
}

.gad-subtitle {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  max-width: 62ch;
  margin: 0;
}

.gad-section {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: 16px;
  padding: 1.5rem 1.75rem;
  margin-bottom: 1.25rem;
}

.gad-section-title {
  font-family: 'Raleway', sans-serif;
  font-weight: 700;
  font-size: 1.02rem;
  color: var(--color-heading);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.85rem;
}

.gad-section-title i {
  color: var(--color-primary);
}

.gad-text {
  font-size: 0.86rem;
  color: var(--color-text);
  line-height: 1.65;
  margin: 0 0 0.9rem;
}

.gad-text:last-child {
  margin-bottom: 0;
}

.gad-text--label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.5rem;
}

.gad-text code,
.gad-table code {
  font-family: 'Courier New', monospace;
  font-size: 0.86em;
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  color: var(--color-primary);
  padding: 0.1rem 0.4rem;
  border-radius: 5px;
}

.gad-code {
  background: #0f172a;
  color: #86efac;
  border-radius: 12px;
  padding: 0.9rem 1rem;
  font-size: 0.78rem;
  line-height: 1.55;
  overflow-x: auto;
  margin: 0 0 0.9rem;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Courier New', monospace;
}

:root[data-theme='dark'] .gad-code {
  background: var(--color-hover-bg);
  color: var(--color-accent);
  border: 1.5px solid var(--color-border);
}

.gad-note {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  background: var(--color-warning-bg);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  line-height: 1.6;
}

.gad-note i {
  color: var(--color-warning-text);
  margin-top: 0.15rem;
  flex-shrink: 0;
}

.gad-note code {
  font-family: 'Courier New', monospace;
  font-size: 0.86em;
  background: rgba(0, 0, 0, 0.08);
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
}

.gad-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
  font-size: 0.84rem;
}

.gad-table th,
.gad-table td {
  text-align: left;
  padding: 0.55rem 0.7rem;
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
  line-height: 1.55;
}

.gad-table tbody tr:last-child th,
.gad-table tbody tr:last-child td {
  border-bottom: none;
}

.gad-table:not(.gad-table--errors) th {
  width: 130px;
  color: var(--color-text-secondary);
  font-weight: 600;
  white-space: nowrap;
}

.gad-table--errors thead th {
  font-weight: 700;
  color: var(--color-heading);
  border-bottom: 2px solid var(--color-border);
}

.gad-table--types thead th {
  font-weight: 700;
  color: var(--color-heading);
  border-bottom: 2px solid var(--color-border);
}

.gad-table--types td:first-child {
  white-space: nowrap;
}

.gad-details {
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  margin-bottom: 0.6rem;
  overflow: hidden;
}

.gad-details:last-of-type {
  margin-bottom: 0.9rem;
}

.gad-details[open] {
  border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
}

.gad-summary {
  cursor: pointer;
  padding: 0.6rem 0.9rem;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--color-text);
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.gad-summary::before {
  content: '▸';
  color: var(--color-text-muted);
  font-size: 0.7rem;
  transition: transform 0.15s;
}

.gad-details[open] .gad-summary::before {
  transform: rotate(90deg);
}

.gad-summary::-webkit-details-marker {
  display: none;
}

.gad-details .gad-code {
  margin: 0;
  border-radius: 0;
  border-top: 1.5px solid var(--color-border);
}

.gad-verb {
  display: inline-block;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 0.76rem;
  color: var(--color-accent-dark);
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  padding: 0.1rem 0.45rem;
  border-radius: 5px;
  margin-right: 0.35rem;
}

.gad-status {
  display: inline-block;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 0.78rem;
  padding: 0.1rem 0.5rem;
  border-radius: 5px;
}

.gad-status--ok {
  color: var(--color-accent-dark);
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
}

.gad-status--error {
  color: #b91c1c;
  background: color-mix(in srgb, var(--color-danger) 14%, transparent);
}

.gad-status--warn {
  color: var(--color-warning-text);
  background: var(--color-warning-bg);
}

.gad-text a,
.gad-text :deep(a) {
  color: var(--color-primary);
  font-weight: 600;
}

@media (max-width: 640px) {
  .gad-page {
    padding: 16px;
  }

  .gad-section {
    padding: 1.1rem 1.25rem;
  }

  .gad-table:not(.gad-table--errors) th {
    width: 100px;
  }
}
</style>
