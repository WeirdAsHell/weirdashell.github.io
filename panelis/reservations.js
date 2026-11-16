/* Reservation data contains codes only; never add personal/contact fields. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.Reservations = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';
  const statuses = {pending: 'Rezervēts', confirmed: 'Apstiprināts'};
  const date = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d;
  function days(start, end) {
    if (!date(start) || !date(end) || start > end) throw Error('Norādi derīgu sākuma un beigu datumu.');
    const result = [], cursor = new Date(start + 'T00:00:00Z');
    while (cursor.toISOString().slice(0, 10) <= end) {
      result.push(cursor.toISOString().slice(0, 10));
      if (result.length > 3660) throw Error('Rezervācija nedrīkst pārsniegt 10 gadus.');
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return result;
  }
  function validate(booking, bookings, products, legacy, allowLegacy = false) {
    if (!products.some(p => p.id === booking.productId)) throw Error('Izvēlies produktu.');
    if (!/^GS-\d{4,8}$/.test(booking.clientCode)) throw Error('Klienta kodam jābūt formātā GS-0001 (4–8 cipari).');
    if (!Object.hasOwn(statuses, booking.status) && !(allowLegacy && ['completed','cancelled'].includes(booking.status))) throw Error('Nederīgs rezervācijas statuss.');
    const dates = days(booking.start, booking.end);
    if (booking.status !== 'cancelled') {
      if (bookings.some(b => b.id !== booking.id && b.productId === booking.productId && b.status !== 'cancelled' && b.start <= booking.end && b.end >= booking.start)) throw Error('Šajos datumos produktam jau ir rezervācija.');
      if (dates.some(d => (legacy[booking.productId] || []).includes(d))) throw Error('Šajos datumos ir iepriekš saglabāts aizņemtības bloķējums.');
    }
    return booking;
  }
  function publicProducts(products, bookings, legacy) {
    return products.map(p => {
      const busy = new Set(legacy[p.id] || []);
      for (const b of bookings) if (b.productId === p.id && b.status !== 'cancelled') days(b.start, b.end).forEach(d => busy.add(d));
      return {id:p.id, name:p.name, description:p.description || '', price:p.price || '', image:p.image || '', busy:[...busy].sort()};
    });
  }
  function range(value, view) {
    const d = new Date(value + 'T00:00:00Z');
    if (view === 'month') {
      d.setUTCDate(1);
      const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
      return days(d.toISOString().slice(0,10), last.toISOString().slice(0,10));
    }
    d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
    const last = new Date(d); last.setUTCDate(last.getUTCDate() + 6);
    return days(d.toISOString().slice(0,10), last.toISOString().slice(0,10));
  }
  return {statuses, date, days, validate, publicProducts, range};
});
