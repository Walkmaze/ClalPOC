import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const LANG_KEY = 'flowmaze_language'

const translations = {
  // ── Header / Navigation ──
  'header.dashboard': { en: 'Dashboard', he: 'לוח בקרה' },
  'header.executions': { en: 'Executions', he: 'הרצות' },
  'header.builder': { en: 'Scenario Builder', he: 'בניית תרחיש' },
  'header.settings': { en: 'Settings', he: 'הגדרות' },
  'header.subtitle': { en: 'Insurance Back-Office Automation', he: 'אוטומציה לבק-אופיס ביטוחי' },
  'footer.text': { en: 'Flowmaze by Walkmaze — AI-Driven Insurance Back-Office Automation', he: 'Flowmaze מבית Walkmaze — אוטומציה ביטוחית מונעת AI' },
  'flood.launching': { en: 'Launching scenarios...', he: 'משגר תרחישים...' },
  'flood.of': { en: 'of', he: 'מתוך' },

  // ── Settings Panel ──
  'settings.language': { en: 'Language', he: 'שפה' },
  'settings.language.en': { en: 'English', he: 'English' },
  'settings.language.he': { en: 'עברית', he: 'עברית' },
  'settings.language.desc': { en: 'Interface language and text direction', he: 'שפת ממשק וכיוון טקסט' },
  // ── DriverU ──
  'driverU.payload': { en: 'DriverU Payload', he: 'מטען DriverU' },
  'driverU.desc': { en: 'JSON payload to be sent to DriverU when integration is active.', he: 'מטען JSON שיישלח ל-DriverU כשהאינטגרציה פעילה.' },
  'driverU.empty': { en: 'No payload available.', he: 'אין מטען זמין.' },
  'driverU.empty.desc': { en: 'The payload will appear here once the flow completes.', he: 'המטען יופיע כאן לאחר השלמת הזרימה.' },
  'driverU.copy': { en: 'Copy', he: 'העתק' },
  // ── Claude Log ──
  'claudeLog.empty': { en: 'No Claude conversation yet.', he: 'אין עדיין שיחה עם Claude.' },
  'claudeLog.empty.desc': { en: 'The request and response will appear here once the flow runs.', he: 'הבקשה והתגובה יופיעו כאן לאחר הרצת הזרימה.' },
  'claudeLog.model': { en: 'Model', he: 'מודל' },
  'claudeLog.requestedAt': { en: 'Requested At', he: 'נשלח בשעה' },
  'claudeLog.respondedAt': { en: 'Responded At', he: 'התקבל בשעה' },
  'claudeLog.tokens': { en: 'Tokens (in → out)', he: 'טוקנים (קלט ← פלט)' },
  'claudeLog.system': { en: 'System Prompt (input)', he: 'הנחיית מערכת (קלט)' },
  'claudeLog.user': { en: 'User Message (input)', he: 'הודעת משתמש (קלט)' },
  'claudeLog.response': { en: 'Claude Response (output)', he: 'תגובת Claude (פלט)' },
  'claudeLog.errorResponse': { en: 'Error Response', he: 'תגובת שגיאה' },

  // ── Scenario Builder ──
  'builder.fundType': { en: 'Fund Type', he: 'סוג קופה' },
  'builder.action': { en: 'Action', he: 'פעולה' },
  'builder.generate': { en: 'Generate Random Scenario', he: 'צור תרחיש אקראי' },
  'builder.apiKey': { en: 'Claude API Key', he: 'מפתח Claude API' },
  'builder.apiKey.configured': { en: 'Key configured', he: 'מפתח הוגדר' },
  'builder.launch': { en: 'Launch Scenario', he: 'הרץ תרחיש' },
  'builder.launching': { en: 'Launching...', he: 'מריץ...' },
  'builder.generateFirst': { en: 'Generate a scenario first', he: 'צור תרחיש קודם' },
  'builder.apiKeyRequired': { en: 'API key required to launch', he: 'נדרש מפתח API להרצה' },
  'builder.bulk': { en: 'Bulk Launch', he: 'הרצה מרובה' },
  'builder.bulk.desc': { en: 'Generate and launch multiple random scenarios with mixed fund types and outcomes. No API key needed.', he: 'צור והרץ מספר תרחישים אקראיים עם סוגי קופות ותוצאות מעורבים. לא נדרש מפתח API.' },
  'builder.bulk.warning': { en: '50 scenarios will take ~15-20 seconds to inject.', he: '50 תרחישים ייקחו ~15-20 שניות להזרקה.' },
  'builder.flood': { en: 'Flood the System', he: 'הצף את המערכת' },

  // ── Executions List ──
  'executions.empty.title': { en: 'No executions yet', he: 'אין הרצות עדיין' },
  'executions.empty.text': { en: 'Go to Scenario Builder to launch your first flow, or flood the system with sample data.', he: 'עבור לבניית תרחיש כדי להריץ את הזרימה הראשונה, או הצף את המערכת בנתוני דוגמה.' },
  'executions.empty.goToBuilder': { en: 'Open Scenario Builder', he: 'פתח בניית תרחיש' },
  'executions.empty.flood': { en: 'Launch 10 random scenarios', he: 'הרץ 10 תרחישים אקראיים' },
  'executions.total': { en: 'Total', he: 'סה"כ' },
  'executions.success': { en: 'Success', he: 'הצלחה' },
  'executions.failed': { en: 'Failed', he: 'נכשל' },
  'executions.running': { en: 'Running', he: 'רץ' },
  'executions.needsHitl': { en: 'Needs HITL', he: 'דורש בדיקה' },
  'executions.title': { en: 'Executions', he: 'הרצות' },
  'executions.filter': { en: 'Filter', he: 'סינון' },
  'executions.search': { en: 'Search ID or member...', he: 'חפש מזהה או חבר...' },
  'executions.allStatuses': { en: 'All Statuses', he: 'כל הסטטוסים' },
  'executions.allPriorities': { en: 'All Priorities', he: 'כל העדיפויות' },
  'executions.allFundTypes': { en: 'All Fund Types', he: 'כל סוגי הקופות' },
  'executions.clearAll': { en: 'Clear all', he: 'נקה הכל' },
  'executions.processId': { en: 'Process ID', he: 'מזהה תהליך' },
  'executions.member': { en: 'Member', he: 'חבר' },
  'executions.fundType': { en: 'Fund Type', he: 'סוג קופה' },
  'executions.status': { en: 'Status', he: 'סטטוס' },
  'executions.priority': { en: 'Priority', he: 'עדיפות' },
  'executions.sla': { en: 'SLA', he: 'SLA' },
  'executions.launched': { en: 'Launched', he: 'הושק' },
  'executions.action': { en: 'Action', he: 'פעולה' },
  'executions.noMatch': { en: 'No executions match your filters.', he: 'אין הרצות התואמות לסינון.' },
  'executions.clearFilters': { en: 'Clear filters', he: 'נקה סינון' },

  // ── Statuses ──
  'status.RUNNING': { en: 'Running', he: 'רץ' },
  'status.COMPLETED': { en: 'Success', he: 'הצלחה' },
  'status.FAILED': { en: 'Failed', he: 'נכשל' },
  'status.BLOCKED': { en: 'Failed', he: 'נכשל' },
  'status.REJECTED': { en: 'Failed', he: 'נכשל' },
  'status.ERROR': { en: 'Failed', he: 'נכשל' },
  'status.PENDING_APPROVAL': { en: 'Needs HITL', he: 'דורש בדיקה' },
  'status.AWAITING_CUSTOMER': { en: 'Awaiting Customer', he: 'ממתין ללקוח' },
  'status.AWAITING_DOCUMENTS': { en: 'Awaiting Customer', he: 'ממתין ללקוח' },
  'status.AWAITING_CONSENT': { en: 'Awaiting Customer', he: 'ממתין ללקוח' },
  'status.CANCELLED': { en: 'Cancelled', he: 'בוטל' },

  // ── Priorities ──
  'priority.High': { en: 'High', he: 'גבוהה' },
  'priority.Medium': { en: 'Medium', he: 'בינונית' },
  'priority.Low': { en: 'Low', he: 'נמוכה' },

  // ── Execution Detail ──
  'detail.back': { en: 'Back to Executions', he: 'חזרה להרצות' },
  'detail.processId': { en: 'Process ID', he: 'מזהה תהליך' },
  'detail.member': { en: 'Member', he: 'חבר' },
  'detail.fundType': { en: 'Fund Type', he: 'סוג קופה' },
  'detail.action': { en: 'Action', he: 'פעולה' },
  'detail.priority': { en: 'Priority', he: 'עדיפות' },
  'detail.slaDeadline': { en: 'SLA Deadline', he: 'מועד SLA' },
  'detail.status': { en: 'Status', he: 'סטטוס' },
  'detail.driverUPayload': { en: 'DriverU Payload', he: 'מטען DriverU' },
  'detail.claudeLog': { en: 'Claude Log', he: 'יומן Claude' },
  'detail.flowExecution': { en: 'Flow Execution', he: 'הרצת זרימה' },

  // ── Dashboard ──
  'dashboard.empty.title': { en: 'No data yet', he: 'אין נתונים עדיין' },
  'dashboard.empty.text': { en: 'Launch scenarios from the Scenario Builder to populate the dashboard.', he: 'הרץ תרחישים מבניית תרחיש כדי לאכלס את לוח הבקרה.' },
  'dashboard.title': { en: 'Operations Dashboard', he: 'לוח בקרה תפעולי' },
  'dashboard.live': { en: 'Live — updates in real-time', he: 'חי — מתעדכן בזמן אמת' },
  'dashboard.totalProcesses': { en: 'Total Processes', he: 'סה"כ תהליכים' },
  'dashboard.completed': { en: 'completed', he: 'הושלמו' },
  'dashboard.successRate': { en: 'Success Rate', he: 'אחוז הצלחה' },
  'dashboard.ofCompleted': { en: 'of', he: 'מתוך' },
  'dashboard.slaCompliance': { en: 'SLA Compliance', he: 'עמידה ב-SLA' },
  'dashboard.withinSla': { en: 'within SLA', he: 'בתוך SLA' },
  'dashboard.avgProcessingTime': { en: 'Avg Processing Time', he: 'זמן עיבוד ממוצע' },
  'dashboard.fastest': { en: 'Fastest', he: 'מהיר' },
  'dashboard.slowest': { en: 'Slowest', he: 'איטי' },
  'dashboard.statusDistribution': { en: 'Status Distribution', he: 'התפלגות סטטוסים' },
  'dashboard.processes': { en: 'processes', he: 'תהליכים' },
  'dashboard.successByFund': { en: 'Success Rate by Fund Type', he: 'אחוז הצלחה לפי סוג קופה' },
  'dashboard.successByFund.desc': { en: 'Percentage of successful completions', he: 'אחוז השלמות מוצלחות' },
  'dashboard.avgTimeByFund': { en: 'Avg Processing Time by Fund', he: 'זמן עיבוד ממוצע לפי קופה' },
  'dashboard.avgTimeByFund.desc': { en: 'Seconds per execution', he: 'שניות להרצה' },
  'dashboard.priorityDist': { en: 'Priority Distribution', he: 'התפלגות עדיפויות' },
  'dashboard.priorityDist.desc': { en: 'Stacked by outcome', he: 'מוערם לפי תוצאה' },
  'dashboard.execOverTime': { en: 'Executions Over Time', he: 'הרצות לאורך זמן' },
  'dashboard.execOverTime.desc': { en: 'Cumulative count', he: 'ספירה מצטברת' },
  'dashboard.slaByFund': { en: 'SLA Compliance by Fund Type', he: 'עמידה ב-SLA לפי סוג קופה' },
  'dashboard.slaByFund.desc': { en: 'Within SLA deadline', he: 'בתוך מועד SLA' },
  'dashboard.hitlResolution': { en: 'HITL Resolution Time', he: 'זמן פתרון HITL' },
  'dashboard.hitlResolution.desc': { en: 'Average seconds to resolve', he: 'שניות ממוצעות לפתרון' },
  'dashboard.noHitl': { en: 'No HITL interactions resolved yet.', he: 'אין אינטראקציות HITL שנפתרו עדיין.' },

  // ── Data Tabs ──
  'dataTabs.inputData': { en: 'Input Data', he: 'נתוני קלט' },
  'dataTabs.contract': { en: 'Customer Contract', he: 'פוליסה לקוח' },
  'dataTabs.regulations': { en: 'Regulations', he: 'רגולציה' },
  'dataTabs.memberId': { en: 'Member ID', he: 'מזהה חבר' },
  'dataTabs.memberName': { en: 'Member Name', he: 'שם חבר' },
  'dataTabs.birthDate': { en: 'Birth Date', he: 'תאריך לידה' },
  'dataTabs.phone': { en: 'Phone', he: 'טלפון' },
  'dataTabs.email': { en: 'Email', he: 'דוא"ל' },
  'dataTabs.accountNumber': { en: 'Account Number', he: 'מספר חשבון' },
  'dataTabs.accountOwner': { en: 'Account Owner', he: 'בעל חשבון' },
  'dataTabs.idPhotoConfidence': { en: 'ID Photo Confidence (%)', he: 'רמת ודאות תמונת ת.ז. (%)' },
  'dataTabs.fundData': { en: 'Fund Data', he: 'נתוני קופה' },
  'dataTabs.withdrawalData': { en: 'Withdrawal Data', he: 'נתוני משיכה' },
  'dataTabs.fundTransferData': { en: 'Fund Transfer Data', he: 'נתוני העברה בין מסלולים' },
  'dataTabs.beneficiaryData': { en: 'Beneficiary Update Data', he: 'נתוני עדכון מוטבים' },
  'dataTabs.employerData': { en: 'Employer Change Data', he: 'נתוני החלפת מעסיק' },
  'dataTabs.earlyRedemptionData': { en: 'Early Redemption Data', he: 'נתוני פדיון מוקדם' },
  'dataTabs.balance': { en: 'Balance (₪)', he: 'יתרה (₪)' },
  'dataTabs.gender': { en: 'Gender', he: 'מין' },
  'dataTabs.employer': { en: 'Employer', he: 'מעסיק' },
  'dataTabs.generalTrackBalance': { en: 'General Track Balance (₪)', he: 'יתרת מסלול כללי (₪)' },
  'dataTabs.stockTrackBalance': { en: 'Stock Track Balance (₪)', he: 'יתרת מסלול מניות (₪)' },
  'dataTabs.totalBalance': { en: 'Total Balance (₪)', he: 'יתרה כוללת (₪)' },
  'dataTabs.withdrawalAmount': { en: 'Withdrawal Amount (₪)', he: 'סכום משיכה (₪)' },
  'dataTabs.startDate': { en: 'Start Date', he: 'תאריך התחלה' },
  'dataTabs.minHoldingMonths': { en: 'Min Holding Months', he: 'חודשי החזקה מינימליים' },
  'dataTabs.sourceTrack': { en: 'Source Track', he: 'מסלול מקור' },
  'dataTabs.targetTrack': { en: 'Target Track', he: 'מסלול יעד' },
  'dataTabs.sourceTrackBalance': { en: 'Source Track Balance (₪)', he: 'יתרת מסלול מקור (₪)' },
  'dataTabs.transferAmount': { en: 'Transfer Amount (₪)', he: 'סכום העברה (₪)' },
  'dataTabs.transferPercentage': { en: 'Transfer Percentage (%)', he: 'אחוז העברה (%)' },
  'dataTabs.changeReason': { en: 'Change Reason', he: 'סיבת שינוי' },
  'dataTabs.notaryVerified': { en: 'Notary Verified', he: 'אומת בנוטריון' },
  'dataTabs.consentObtained': { en: 'Consent Obtained', he: 'הסכמה התקבלה' },
  'dataTabs.earlyWithdrawalAllowed': { en: 'Early Withdrawal Allowed', he: 'משיכה מוקדמת מותרת' },
  'dataTabs.currentEmployer': { en: 'Current Employer', he: 'מעסיק נוכחי' },
  'dataTabs.newEmployer': { en: 'New Employer', he: 'מעסיק חדש' },
  'dataTabs.employmentEndDate': { en: 'Employment End Date', he: 'תאריך סיום העסקה' },
  'dataTabs.newEmploymentStartDate': { en: 'New Employment Start Date', he: 'תאריך תחילת העסקה חדשה' },
  'dataTabs.transferBalance': { en: 'Transfer Balance (₪)', he: 'יתרת העברה (₪)' },
  'dataTabs.gapDays': { en: 'Gap Days', he: 'ימי פער' },
  'dataTabs.severanceIncluded': { en: 'Severance Included', he: 'כולל פיצויים' },
  'dataTabs.employerApproval': { en: 'Employer Approval Received', he: 'אישור מעסיק התקבל' },
  'dataTabs.continuousEmployment': { en: 'Continuous Employment', he: 'העסקה רציפה' },
  'dataTabs.currentGeneralTrack': { en: 'Current General Track (%)', he: 'מסלול כללי נוכחי (%)' },
  'dataTabs.currentStockTrack': { en: 'Current Stock Track (%)', he: 'מסלול מניות נוכחי (%)' },
  'dataTabs.targetGeneralTrack': { en: 'Target General Track (%)', he: 'מסלול כללי יעד (%)' },
  'dataTabs.targetStockTrack': { en: 'Target Stock Track (%)', he: 'מסלול מניות יעד (%)' },
  'dataTabs.rebalanceAmount': { en: 'Rebalance Amount (₪)', he: 'סכום איזון מחדש (₪)' },
  'dataTabs.rebalanceDirection': { en: 'Rebalance Direction', he: 'כיוון איזון מחדש' },
  'dataTabs.redemptionAmount': { en: 'Redemption Amount (₪)', he: 'סכום פדיון (₪)' },
  'dataTabs.redemptionReason': { en: 'Redemption Reason', he: 'סיבת פדיון' },
  'dataTabs.supportingDocuments': { en: 'Supporting Documents', he: 'מסמכים תומכים' },
  'dataTabs.taxAware': { en: 'Tax Aware', he: 'מודע מס' },
  'dataTabs.liquidityDate': { en: 'Liquidity Date', he: 'תאריך נזילות' },
  'dataTabs.employerNotified': { en: 'Employer Notified', he: 'מעסיק עודכן' },
  'dataTabs.yes': { en: 'Yes', he: 'כן' },
  'dataTabs.no': { en: 'No', he: 'לא' },
  'dataTabs.select': { en: 'Select...', he: 'בחר...' },
  'dataTabs.contractId': { en: 'Contract ID:', he: 'מזהה פוליסה:' },
  'dataTabs.customer': { en: 'Customer:', he: 'לקוח:' },
  'dataTabs.insuranceCompany': { en: 'Insurance Company:', he: 'חברת ביטוח:' },
  'dataTabs.fundTypeLabel': { en: 'Fund Type:', he: 'סוג קופה:' },
  'dataTabs.effective': { en: 'Effective:', he: 'בתוקף מ:' },
  'dataTabs.expires': { en: 'Expires:', he: 'פג תוקף:' },
  'dataTabs.contractTerms': { en: 'Contract Terms', he: 'תנאי פוליסה' },
  'dataTabs.clauses': { en: 'clauses', he: 'סעיפים' },
  'dataTabs.generateToSeeContract': { en: 'Generate a scenario to see contract terms', he: 'צור תרחיש כדי לראות תנאי פוליסה' },
  'dataTabs.generateToSeeRegulations': { en: 'Generate a scenario to see regulations', he: 'צור תרחיש כדי לראות רגולציות' },
  'dataTabs.addClause': { en: 'Add Clause', he: 'הוסף סעיף' },
  'dataTabs.addRegulation': { en: 'Add Regulation', he: 'הוסף תקנה' },
  'dataTabs.addRequirement': { en: 'Add Requirement', he: 'הוסף דרישה' },
  'dataTabs.newClauseTitle': { en: 'New Clause', he: 'סעיף חדש' },
  'dataTabs.newClauseDesc': { en: 'Enter clause description...', he: 'הזן תיאור סעיף...' },
  'dataTabs.newRegTitle': { en: 'New Regulation', he: 'תקנה חדשה' },
  'dataTabs.newRegRequirement': { en: 'Enter requirement...', he: 'הזן דרישה...' },
  'dataTabs.currentBeneficiaries': { en: 'Current Beneficiaries', he: 'מוטבים נוכחיים' },
  'dataTabs.newBeneficiaries': { en: 'New Beneficiaries', he: 'מוטבים חדשים' },

  // ── Flow Execution ──
  'flow.title': { en: 'Flow Execution', he: 'הרצת זרימה' },
  'flow.cardsView': { en: 'Cards', he: 'כרטיסים' },
  'flow.diagramView': { en: 'Flow Diagram', he: 'תרשים זרימה' },
  'flow.executing': { en: 'Executing validation...', he: 'מבצע בדיקה...' },
  'flow.requiresReview': { en: 'Requires Human Review', he: 'דורש בדיקה אנושית' },
  'flow.clickToReview': { en: 'Click to review', he: 'לחץ לבדיקה' },
  'flow.rule': { en: 'Rule:', he: 'כלל:' },
  'flow.value': { en: 'Value:', he: 'ערך:' },
  'flow.emptyState': { en: 'Generate a scenario and run the flow to see the AI-driven validation engine in action', he: 'צור תרחיש והרץ את הזרימה כדי לראות את מנוע הבדיקה מבוסס AI בפעולה' },
  'flow.acceptProceed': { en: 'Accept & Proceed', he: 'אשר והמשך' },
  'flow.cancel': { en: 'Cancel', he: 'ביטול' },
  'flow.approvedByHuman': { en: 'Approved by human reviewer', he: 'אושר על ידי בודק אנושי' },
  'flow.rejectedByHuman': { en: 'Rejected by human reviewer', he: 'נדחה על ידי בודק אנושי' },
  'flow.escalated': { en: 'Escalated for further review', he: 'הועבר לבדיקה נוספת' },

  // Outcome titles
  'flow.outcome.withdrawalApproved': { en: 'Withdrawal Approved', he: 'משיכה אושרה' },
  'flow.outcome.withdrawalBlocked': { en: 'Withdrawal Blocked', he: 'משיכה נחסמה' },
  'flow.outcome.fundTransferApproved': { en: 'Fund Transfer Approved', he: 'העברה בין מסלולים אושרה' },
  'flow.outcome.fundTransferBlocked': { en: 'Fund Transfer Blocked', he: 'העברה בין מסלולים נחסמה' },
  'flow.outcome.beneficiaryApproved': { en: 'Beneficiary Update Approved', he: 'עדכון מוטבים אושר' },
  'flow.outcome.beneficiaryBlocked': { en: 'Beneficiary Update Blocked', he: 'עדכון מוטבים נחסם' },
  'flow.outcome.employerApproved': { en: 'Employer Change Approved', he: 'החלפת מעסיק אושרה' },
  'flow.outcome.employerBlocked': { en: 'Employer Change Blocked', he: 'החלפת מעסיק נחסמה' },
  'flow.outcome.earlyRedemptionApproved': { en: 'Early Redemption Approved', he: 'פדיון מוקדם אושר' },
  'flow.outcome.earlyRedemptionBlocked': { en: 'Early Redemption Blocked', he: 'פדיון מוקדם נחסם' },
  'flow.outcome.customerAction': { en: 'Customer Action Required', he: 'נדרשת פעולת לקוח' },
  'flow.outcome.transferFees': { en: 'Transfer — Fees Apply', he: 'העברה — חלות עמלות' },
  'flow.outcome.transferApproval': { en: 'Transfer Requires Approval', he: 'העברה דורשת אישור' },
  'flow.outcome.docsRequired': { en: 'Documentation Required', he: 'נדרשים מסמכים' },
  'flow.outcome.employerApprovalRequired': { en: 'Employer Approval Required', he: 'נדרש אישור מעסיק' },
  'flow.outcome.earlyWithdrawalTax': { en: 'Early Withdrawal — Tax & Fees', he: 'משיכה מוקדמת — מס ועמלות' },
  'flow.outcome.earlyRedemptionTax': { en: 'Early Redemption — Tax Applies', he: 'פדיון מוקדם — חל מס' },
  'flow.outcome.redemptionApproval': { en: 'Redemption Requires Approval', he: 'פדיון דורש אישור' },

  // Tax/breakdown
  'flow.grossAmount': { en: 'Gross Amount', he: 'סכום ברוטו' },
  'flow.incomeTax': { en: 'Income Tax', he: 'מס הכנסה' },
  'flow.capitalGainsTax': { en: 'Capital Gains Tax', he: 'מס רווחי הון' },
  'flow.earlyWithdrawalFee': { en: 'Early Withdrawal Fee', he: 'עמלת משיכה מוקדמת' },
  'flow.netAmount': { en: 'Net Amount', he: 'סכום נטו' },
  'flow.trackAllocation': { en: 'Track Allocation Breakdown', he: 'פירוט הקצאת מסלולים' },
  'flow.totalBalance': { en: 'Total Balance', he: 'יתרה כוללת' },
  'flow.generalTrack': { en: 'General Track', he: 'מסלול כללי' },
  'flow.stockTrack': { en: 'Stock Track', he: 'מסלול מניות' },
  'flow.totalWithdrawal': { en: 'Total Withdrawal', he: 'סה"כ משיכה' },

  // ── HITL Panel ──
  'hitl.title': { en: 'Human Review', he: 'בדיקה אנושית' },
  'hitl.step': { en: 'Step', he: 'שלב' },
  'hitl.of': { en: 'of', he: 'מתוך' },
  'hitl.locked': { en: 'Complete previous step first', he: 'השלם שלב קודם תחילה' },
  'hitl.submitted': { en: 'Review Submitted', he: 'הבדיקה הוגשה' },
  'hitl.submitted.desc': { en: 'The flow will continue based on your decision.', he: 'הזרימה תמשיך על פי החלטתך.' },
  'hitl.submit': { en: 'Submit Review', he: 'הגש בדיקה' },
  'hitl.next': { en: 'Next Step', he: 'שלב הבא' },
  'hitl.yes': { en: 'Yes', he: 'כן' },
  'hitl.no': { en: 'No', he: 'לא' },
  'hitl.uploadFile': { en: 'Click to simulate file upload', he: 'לחץ לסימולציית העלאת קובץ' },

  // ── Audit Trail ──
  'audit.title': { en: 'Audit Trail', he: 'מסלול ביקורת' },
  'audit.entries': { en: 'entries', he: 'רשומות' },
  'audit.processId': { en: 'Process ID', he: 'מזהה תהליך' },
  'audit.member': { en: 'Member', he: 'חבר' },
  'audit.fundType': { en: 'Fund Type', he: 'סוג קופה' },
  'audit.action': { en: 'Action', he: 'פעולה' },
  'audit.status': { en: 'Status', he: 'סטטוס' },
  'audit.time': { en: 'Time', he: 'זמן' },
  'audit.category': { en: 'Category', he: 'קטגוריה' },
  'audit.source': { en: 'Source', he: 'מקור' },
  'audit.result': { en: 'Result', he: 'תוצאה' },
  'audit.details': { en: 'Details', he: 'פרטים' },


  // ── Categories ──
  'cat.identity': { en: 'identity', he: 'זהות' },
  'cat.eligibility': { en: 'eligibility', he: 'זכאות' },
  'cat.financial': { en: 'financial', he: 'פיננסי' },
  'cat.regulatory': { en: 'regulatory', he: 'רגולטורי' },
  'cat.contract': { en: 'contract', he: 'פוליסות' },
  'cat.processing': { en: 'processing', he: 'עיבוד' },
  'cat.withdrawal': { en: 'withdrawal', he: 'משיכה' },
  'cat.sla': { en: 'sla', he: 'הסכם שירות' },
  'cat.penalties': { en: 'penalties', he: 'קנסות' },
  'cat.system': { en: 'system', he: 'מערכת' },
  'cat.ai': { en: 'ai', he: 'AI' },
  'cat.hitl': { en: 'hitl', he: 'בדיקה אנושית' },
  'cat.integration': { en: 'integration', he: 'אינטגרציה' },

  // ── Consequences ──
  'consequence.block': { en: 'block', he: 'חסימה' },
  'consequence.require_approval': { en: 'require_approval', he: 'דורש אישור' },
  'consequence.require_hitl': { en: 'require_hitl', he: 'דורש בדיקה' },
  'consequence.apply_fee': { en: 'apply_fee', he: 'חיוב עמלה' },
  'consequence.notify': { en: 'notify', he: 'התראה' },

  // ── Result statuses ──
  'result.SUCCESS': { en: 'SUCCESS', he: 'הצלחה' },
  'result.COMPLETED': { en: 'COMPLETED', he: 'הושלם' },
  'result.PASS': { en: 'PASS', he: 'עבר' },
  'result.FAIL': { en: 'FAIL', he: 'נכשל' },
  'result.BLOCKED': { en: 'BLOCKED', he: 'נחסם' },
  'result.REJECTED': { en: 'REJECTED', he: 'נדחה' },
  'result.WARNING': { en: 'WARNING', he: 'אזהרה' },
  'result.RUNNING': { en: 'RUNNING', he: 'רץ' },
  'result.INFO': { en: 'INFO', he: 'מידע' },
  'result.PENDING': { en: 'PENDING', he: 'ממתין' },
  'result.PAUSED': { en: 'PAUSED', he: 'מושהה' },
  'result.RESOLVED': { en: 'RESOLVED', he: 'נפתר' },
  'result.ESCALATED': { en: 'ESCALATED', he: 'הועבר' },
  'result.AWAITING_DOCUMENTS': { en: 'AWAITING_DOCUMENTS', he: 'ממתין למסמכים' },
  'result.AWAITING_CONSENT': { en: 'AWAITING_CONSENT', he: 'ממתין להסכמה' },

  // ── Common ──
  'common.yes': { en: 'Yes', he: 'כן' },
  'common.no': { en: 'No', he: 'לא' },

  // ── Relative time ──
  'time.justNow': { en: 'just now', he: 'עכשיו' },
  'time.minAgo': { en: 'min ago', he: 'דק\' לפני' },
  'time.today': { en: 'today', he: 'היום' },
  'time.breached': { en: 'Breached', he: 'חריגה' },
  'time.hLeft': { en: 'h left', he: 'ש\' נותרו' },
  'time.dLeft': { en: 'd left', he: 'י\' נותרו' },

  // ── Fund labels (for charts) ──
  'fund.investment': { en: 'Investment', he: 'גמל להשקעה' },
  'fund.compensation': { en: 'Compensation', he: 'גמל פיצויים' },
  'fund.study': { en: 'Study Fund', he: 'קרן השתלמות' },

  // ── Status group labels (for charts) ──
  'statusGroup.Success': { en: 'Success', he: 'הצלחה' },
  'statusGroup.Failed': { en: 'Failed', he: 'נכשל' },
  'statusGroup.Running': { en: 'Running', he: 'רץ' },
  'statusGroup.NeedsHITL': { en: 'Needs HITL', he: 'דורש בדיקה' },
  'statusGroup.AwaitingCustomer': { en: 'Awaiting Customer', he: 'ממתין ללקוח' },
  'statusGroup.Cancelled': { en: 'Cancelled', he: 'בוטל' },
  'statusGroup.Other': { en: 'Other', he: 'אחר' },

  // ── FlowExecution remaining ──
  'flow.eligibleDate': { en: 'Eligible date:', he: 'תאריך זכאות:' },
  'flow.smsSent': { en: 'SMS sent to member:', he: 'SMS נשלח לחבר:' },
  'flow.emailSent': { en: 'Email sent with:', he: 'דוא"ל נשלח עם:' },
  'flow.photoGuidelines': { en: 'Photo guidelines & quality requirements', he: 'הנחיות צילום ודרישות איכות' },
  'flow.secureUploadLink': { en: 'Secure upload link:', he: 'קישור העלאה מאובטח:' },
  'flow.futureTrigger': { en: 'Future trigger: auto-launch new validation on upload', he: 'טריגר עתידי: השקת בדיקה אוטומטית בהעלאה' },
  'flow.awaitingDocs': { en: '→ Status: AWAITING_CUSTOMER_DOCUMENTS', he: '→ סטטוס: ממתין למסמכי לקוח' },
  'flow.processCompleted': { en: 'Process completed — withdrawal not executed', he: 'התהליך הושלם — המשיכה לא בוצעה' },
  'flow.notificationSent': { en: 'Notification sent to member:', he: 'התראה נשלחה לחבר:' },
  'flow.consentMessage': { en: 'Message sent to customer for consent:', he: 'הודעה נשלחה ללקוח לקבלת הסכמה:' },
  'flow.txnConfirmed': { en: 'Status: 200 OK — Transaction confirmed', he: 'סטטוס: 200 OK — העסקה אושרה' },
}

const I18nContext = createContext()

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || 'en')

  const changeLang = useCallback((newLang) => {
    setLang(newLang)
    localStorage.setItem(LANG_KEY, newLang)
  }, [])

  useEffect(() => {
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang])

  return (
    <I18nContext.Provider value={{ lang, setLang: changeLang }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}

export function useT() {
  const { lang } = useI18n()
  return useCallback((key, fallback) => {
    const entry = translations[key]
    if (!entry) return fallback || key
    return entry[lang] || entry.en || fallback || key
  }, [lang])
}

/**
 * Hook for picking localized fields from data objects.
 * Looks for `fieldHe` or `field_he` when lang is Hebrew.
 * Usage: loc(clause, 'title') → clause.titleHe || clause.title
 *        loc(member, 'member_name') → member.member_name_he || member.member_name
 */
export function useLoc() {
  const { lang } = useI18n()
  return useCallback((obj, field) => {
    if (!obj) return ''
    if (lang === 'he') {
      const camel = field + 'He'
      const snake = field + '_he'
      if (obj[camel] != null) return obj[camel]
      if (obj[snake] != null) return obj[snake]
    }
    return obj[field] ?? ''
  }, [lang])
}
