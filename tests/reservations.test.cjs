const {test} = require('node:test');
const assert = require('node:assert/strict');
const M = require('../panelis/reservations.js');
const products=[{id:'a',name:'Arka',busy:['2026-11-16']},{id:'b',name:'Galds'}];
const legacy={a:['2026-11-16'],b:[]};
const booking={id:'1',productId:'a',clientCode:'GS-0001',start:'2026-11-18',end:'2026-11-20',status:'confirmed'};
test('inclusive ranges, leap years and invalid dates',()=>{
 assert.deepEqual(M.days('2024-02-28','2024-03-01'),['2024-02-28','2024-02-29','2024-03-01']);
 for(const [a,b] of [['2026-02-29','2026-03-01'],['2026-11-20','2026-11-18'],['x','x']])assert.throws(()=>M.days(a,b));
});
test('overlap at either boundary is rejected, adjacent days and different products allowed',()=>{
 for(const [start,end] of [['2026-11-17','2026-11-18'],['2026-11-20','2026-11-21'],['2026-11-19','2026-11-19']])assert.throws(()=>M.validate({...booking,id:'2',start,end},[booking],products,legacy));
 M.validate({...booking,id:'2',start:'2026-11-21',end:'2026-11-21'},[booking],products,legacy);
 M.validate({...booking,id:'2',productId:'b'},[booking],products,legacy);
 M.validate({...booking,end:'2026-11-22'},[booking],products,legacy);
});
test('legacy dates cannot be double booked, cancelled bookings release dates',()=>{
 assert.throws(()=>M.validate({...booking,start:'2026-11-16'},[],products,legacy));
 M.validate({...booking,id:'2'},[{...booking,status:'cancelled'}],products,legacy);
 M.validate({...booking,status:'cancelled',start:'2026-11-16'},[],products,legacy);
});
test('code, status and product validation',()=>{
 for(const change of [{clientCode:'Anna'},{clientCode:'a@b.lv'},{status:'x'},{productId:'missing'}])assert.throws(()=>M.validate({...booking,...change},[],products,legacy));
});
test('public projection preserves original busy dates without leaking private fields',()=>{
 const pub=M.publicProducts(products,[booking,{...booking,id:'2',productId:'b',status:'cancelled'}],legacy);
 assert.deepEqual(pub[0].busy,['2026-11-16','2026-11-18','2026-11-19','2026-11-20']);
 assert.deepEqual(pub[1].busy,[]);
 assert(!JSON.stringify(pub).includes('GS-0001'));
 assert(!JSON.stringify(pub).includes('confirmed'));
 assert.deepEqual(M.publicProducts(products,[],legacy)[0].busy,['2026-11-16']);
});
test('month and Monday-first week across year boundary',()=>{
 assert.equal(M.range('2024-02-12','month').length,29);
 assert.deepEqual(M.range('2027-01-01','week'),['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);
});
