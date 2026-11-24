import { describe, expect, it } from 'vitest';
import { workflowFilterOptions, normalizeWorkflowFilters } from './workflow-filters';
const catalog = {
 booking_types: [{id:1,name:'car_booking'},{id:5,name:'barber_booking'},{id:8,name:'transportation_booking'}],
 booking_type_statuses: {1:[1,15,16,3,4,5,6,7],5:[1,6,11,12,13],8:[1,14,17,18,15,16,3,4,5,6,7,8,9,10]},
 statuses: Array.from({length:18},(_,i)=>({id:i+1})),
};
describe('workflow-aware filters',()=>{
 it('hides barber and transportation stages for a commander of cars only',()=>{
  const result=workflowFilterOptions({managed_booking_types:[1]},catalog);
  expect(result.stages).toEqual(['vice_approver','approver','realization','closed']);
  expect(result.statuses.map(s=>s.id)).not.toContain(11);
  expect(result.statuses.map(s=>s.id)).not.toContain(8);
 });
 it('the barber has only its one waiting stage and closed, even for a commander',()=>{
  expect(workflowFilterOptions({managed_booking_types:[5]},catalog).stages).toEqual(['barber','closed']);
 });
 it('transportation exposes officer and supplier stages but never the barber',()=>{
  const stages=workflowFilterOptions({managed_booking_types:[8]},catalog).stages;
  expect(stages).toEqual(['control_officer','vice_approver','approver','supplier_files','supplier_approval','supplier_number','realization','closed']);
 });
 it('narrows to the selected domain and never includes an unauthorized domain',()=>{
  const me={managed_booking_types:[1,5]};
  expect(workflowFilterOptions(me,catalog,'1').stages).not.toContain('barber');
  expect(workflowFilterOptions(me,catalog,'1,5').stages).toContain('barber');
  expect(workflowFilterOptions(me,catalog,'8').stages).toEqual([]);
 });
 it('clears stale filters after changing roles or selecting another domain, retaining search and sorting',()=>{
  expect(normalizeWorkflowFilters({types:'1',stage:'barber',statuses:'11,1',q:'123',sort:'serial_number'}, {managed_booking_types:[1]},catalog)).toEqual({types:'1',stage:'',statuses:'1',q:'123',sort:'serial_number'});
 });
 it('offers super admins the union of domains and honors their selected domain',()=>{
  const me={is_super_admin:true,managed_booking_types:[]};
  expect(workflowFilterOptions(me,catalog).stages).toContain('barber');
  expect(workflowFilterOptions(me,catalog,'1').stages).not.toContain('control_officer');
 });
});
describe('a type with a route of its own (the clearance grant)',()=>{
 const withRoute={
  booking_types:[...catalog.booking_types,{id:14,name:'clearance_grant_booking'}],
  booking_type_statuses:{...catalog.booking_type_statuses,14:[4,101,102,103,104,105]},
  statuses:[...catalog.statuses,{id:101,name:'interview_assignment'},{id:102,name:'interview_scheduled'},{id:103,name:'interviewed'},{id:104,name:'awaiting_clearance'},{id:105,name:'clearance_granted'}],
 };
 it('offers its steps as stages, then closed, and its own statuses',()=>{
  const result=workflowFilterOptions({managed_booking_types:[14]},withRoute);
  expect(result.stages).toEqual(['interview_assignment','interview_scheduled','interviewed','awaiting_clearance','closed']);
  expect(result.statuses.map(s=>s.id)).toEqual([4,101,102,103,104,105]);
 });
 it('keeps a route stage that was chosen',()=>{
  expect(normalizeWorkflowFilters({types:'14',stage:'interviewed',statuses:'104'},{managed_booking_types:[14]},withRoute)).toEqual({types:'14',stage:'interviewed',statuses:'104'});
 });
});
describe('the service desk (תקשוב): its queue and handling as stages',()=>{
 const withDesk={
  booking_types:[...catalog.booking_types,{id:20,name:'software_install'},{id:24,name:'user_open'}],
  booking_type_statuses:{...catalog.booking_type_statuses,20:[1,151,5,6,7],24:[1,151,5,6,7]},
  statuses:[...catalog.statuses,{id:151,name:'in_service_desk'}],
  routes:{20:{key:'ict_service_desk',initial_status_id:1,success_status_id:5,status_ids:[1,151,5,7,6],steps:[{status_id:1,label:'ההזמנה נשלחה'},{status_id:151,label:'בטיפול המוקד'},{status_id:5,label:'סיום טיפול'}],requester_role:{id:5,name:'user',label:'משתמש'},owner_role:{id:152,name:'admin_ict',label:'מפקד תקשוב'},roles:[{id:4,name:'vice_approver',label:'גורם מטפל'},{id:152,name:'admin_ict',label:'מפקד תקשוב'}]}},
 };
 it('offers the desk\'s two stages, then closed, and never the vice approver\'s stage for its sent requests',()=>{
  const result=workflowFilterOptions({managed_booking_types:[20,24]},withDesk);
  expect(result.stages).toEqual(['service_desk_queue','service_desk_handling','closed']);
  expect(result.statuses.map(s=>s.id)).toEqual([1,5,6,7,151]);
 });
 it('lists the desk\'s stages after the approval route\'s for the commander who sees both',()=>{
  expect(workflowFilterOptions({managed_booking_types:[1,20]},withDesk).stages).toEqual(['vice_approver','approver','realization','service_desk_queue','service_desk_handling','closed']);
 });
 it('keeps a chosen desk stage',()=>{
  expect(normalizeWorkflowFilters({types:'20',stage:'service_desk_handling',statuses:'151'},{managed_booking_types:[20]},withDesk)).toEqual({types:'20',stage:'service_desk_handling',statuses:'151'});
 });
});
