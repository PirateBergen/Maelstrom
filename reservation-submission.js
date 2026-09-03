(() => {
  const storageKey = 'maelstrom-reservation-retry-v1';
  let pending = null;
  try { pending = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch (_) {}
  async function reference(formData) {
    const fields = [...formData.entries()].filter(([key]) => !['submittedAt', 'submissionId'].includes(key))
      .map(([key, value]) => [key, String(value)]).sort(([a], [b]) => a.localeCompare(b));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(fields)));
    const fingerprint = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (!pending || pending.fingerprint !== fingerprint || !/^[a-f0-9]{32}$/.test(pending.id || '') ||
        !Number.isFinite(pending.created) || Date.now() - pending.created > 86400000 || pending.created > Date.now()) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      pending = { fingerprint, id:[...bytes].map(byte => byte.toString(16).padStart(2, '0')).join(''), created:Date.now() };
      // Only a digest and random retry identifier are stored, never form fields.
      try { sessionStorage.setItem(storageKey, JSON.stringify(pending)); } catch (_) {}
    }
    return pending.id;
  }
  function clear() {
    pending = null;
    try { sessionStorage.removeItem(storageKey); } catch (_) {}
  }
  window.MaelstromReservationSubmission = { reference, clear };
})();
