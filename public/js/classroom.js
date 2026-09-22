document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const classroomId = urlParams.get('id');

  if (!classroomId) {
    showToast('No classroom ID specified!', 'error');
    window.location.href = '/index.html';
    return;
  }

  document.getElementById('prob-bank-link').href = `/problems.html?id=${classroomId}`;
  document.getElementById('leaderboard-link').href = `/leaderboard.html?id=${classroomId}`;

  let classroomData = null;

  // Sidebar tab navigation setup
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      sidebarItems.forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      item.classList.add('active');
      document.getElementById(item.dataset.tab).classList.add('active');

      const tabName = item.dataset.tab;
      if (tabName === 'tab-matrix') loadMatrixTab();
      if (tabName === 'tab-health') loadHealthTab();
      if (tabName === 'tab-members') loadMembersTab();
      if (tabName === 'tab-resources') loadResourcesTab();
      if (tabName === 'tab-alerts') loadAlertsTab();
      if (tabName === 'tab-live') loadLiveTab();
      if (tabName === 'tab-messages') loadMessagesTab();
      if (tabName === 'tab-plagiarism') loadPlagiarismTab();
      if (tabName === 'tab-student-info') loadStudentInfoTab();
      if (tabName === 'tab-gradings') loadGradingsTab();
      if (tabName === 'tab-requests') loadRequestsTab();
      if (tabName === 'tab-settings') loadSettingsTab();
    });
  });

  // Load Classroom Details & Header
  const loadClassroomHeader = async () => {
    try {
      const res = await apiFetch(`/classrooms/${classroomId}`);
      classroomData = res.data;

      const userRole = (classroomData.user_role || '').toLowerCase();
      const isInstructor = userRole === 'instructor';
      const isStaff = isInstructor || userRole === 'ta';

      document.getElementById('classroom-title').textContent = classroomData.classroom_name;
      document.getElementById('classroom-role-badge-container').innerHTML = renderRoleBadge(classroomData.user_role);
      
      document.getElementById('classroom-subtitle').innerHTML = `
        ${classroomData.description || 'Active Course Workspace'} &nbsp;|&nbsp; 
        Room: <code>${classroomData.room_number}</code> &nbsp;|&nbsp; 
        Pass: <code>${classroomData.room_password}</code>
      `;

      // Apply role visibility rules
      document.querySelectorAll('.instructor-only').forEach(el => el.style.display = isInstructor ? 'flex' : 'none');
      document.querySelectorAll('.staff-only').forEach(el => el.style.display = isStaff ? 'inline-flex' : 'none');
      document.querySelectorAll('.staff-tab').forEach(el => el.style.display = isStaff ? 'flex' : 'none');

      // Auto-select tab if specified in URL query parameter (e.g. classroom.html?id=4&tab=requests)
      const requestedTabParam = urlParams.get('tab');
      if (requestedTabParam) {
        const targetBtn = document.querySelector(`.sidebar-item[data-tab="tab-${requestedTabParam}"]`);
        if (targetBtn && targetBtn.style.display !== 'none') {
          targetBtn.click();
          return;
        }
      }

      await loadHomeworkTab();
    } catch (err) {
      showToast(`Error loading classroom: ${err.message}`, 'error');
      window.location.href = '/index.html';
    }
  };

  // TAB 1: Homework Sets
  const loadHomeworkTab = async () => {
    const listEl = document.getElementById('homework-list');
    listEl.innerHTML = renderSkeletonRows(2);
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/homework`);
      const homeworks = res.data;

      const userRole = (classroomData?.user_role || '').toLowerCase();
      const isInstructor = userRole === 'instructor';

      if (homeworks.length === 0) {
        listEl.innerHTML = renderEmptyState({
          icon: 'book-open',
          title: 'No Homework Sets Created',
          message: isInstructor 
            ? 'Create your first homework assignment set for this classroom to start evaluating learners.'
            : 'No homework assignments have been published for this classroom yet.',
          actionText: isInstructor ? '<i class="fa-solid fa-square-plus"></i> Create Homework Set' : null,
          actionFn: isInstructor ? () => document.getElementById('create-hw-modal').classList.add('active') : null
        });
        return;
      }

      listEl.innerHTML = homeworks.map(hw => `
        <div class="card">
          <div class="card-info">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
              <h4 class="card-title"><a href="/homework.html?id=${hw.homework_id}">${hw.title}</a></h4>
              ${hw.is_published 
                ? '<span class="badge badge-green"><i class="fa-solid fa-circle-check"></i> Published</span>' 
                : '<span class="badge badge-yellow"><i class="fa-solid fa-clock"></i> Draft</span>'}
            </div>
            <p class="card-subtitle">${hw.description || 'No description provided.'}</p>
            
            <div class="card-details">
              <div class="detail-row">
                <strong>Deadline:</strong>
                <span>${hw.deadline ? new Date(hw.deadline).toLocaleString() : 'No Deadline'}</span>
              </div>
              <div class="detail-row">
                <strong>Total Points / Qs:</strong>
                <span>${hw.total_points} Points (${hw.question_count} Questions)</span>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem; margin-top: 1.25rem;">
            <a href="/homework.html?id=${hw.homework_id}" class="btn btn-primary btn-sm" style="flex: 1;">
              <i class="fa-solid ${isInstructor ? 'fa-plus-circle' : 'fa-file-pen'}"></i> ${isInstructor ? 'Manage & Add Questions' : 'View & Submit Solution'}
            </a>
            ${isInstructor ? `
              <button class="btn btn-outline btn-sm" onclick="togglePublish(${hw.homework_id}, ${!hw.is_published})">
                ${hw.is_published ? '<i class="fa-solid fa-eye-slash"></i> Unpublish' : '<i class="fa-solid fa-paper-plane"></i> Publish'}
              </button>
            ` : ''}
          </div>
        </div>
      `).join('');
    } catch (err) {
      listEl.innerHTML = `<div class="card"><p style="color: var(--status-red);">Error: ${err.message}</p></div>`;
    }
  };

  // TAB 2: Submission Matrix
  const loadMatrixTab = async () => {
    const selectEl = document.getElementById('matrix-hw-select');
    const containerEl = document.getElementById('matrix-container');

    try {
      const hwRes = await apiFetch(`/classrooms/${classroomId}/homework`);
      selectEl.innerHTML = '<option value="">-- Select Homework Set --</option>' + 
        hwRes.data.map(h => `<option value="${h.homework_id}">${h.title}</option>`).join('');

      selectEl.onchange = async () => {
        const hwId = selectEl.value;
        if (!hwId) {
          containerEl.innerHTML = renderEmptyState({
            icon: 'table-cells',
            title: 'Select a Homework Set',
            message: 'Choose a homework set from the dropdown above to render the submission matrix.'
          });
          return;
        }

        containerEl.innerHTML = renderSkeletonRows(3);
        const res = await apiFetch(`/homework/${hwId}/matrix`);
        const { questions, matrix } = res.data;

        if (matrix.length === 0 || questions.length === 0) {
          containerEl.innerHTML = renderEmptyState({
            icon: 'table-cells',
            title: 'No Submissions Found',
            message: 'There are no questions or submissions logged for this homework set yet.'
          });
          return;
        }

        containerEl.innerHTML = `
          <table>
            <thead>
              <tr>
                <th>Learner Name</th>
                ${questions.map(q => `<th style="text-align: center;">Q${q.order_number || q.question_id} (${q.points}pts)</th>`).join('')}
                <th style="text-align: center;">Total Score</th>
                <th style="text-align: center;">Late Submissions</th>
              </tr>
            </thead>
            <tbody>
              ${matrix.map(row => `
                <tr>
                  <td>
                    <div style="font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
                      ${row.full_name}
                      ${row.streak >= 3 ? `
                        <span class="badge badge-yellow" style="font-size: 0.7rem; border-radius: 999px;">
                          <i class="fa-solid fa-fire text-amber-500"></i> ${row.streak} STREAK
                        </span>
                      ` : ''}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${row.email}</div>
                  </td>
                  ${questions.map(q => {
                    const qData = row.questions[q.question_id];
                    let badgeClass = qData.status === 'green' ? 'badge-green' : qData.status === 'orange' ? 'badge-yellow' : 'badge-gray';
                    return `
                      <td style="text-align: center;">
                        <span class="badge ${badgeClass}">
                          ${qData.label} ${qData.score !== null ? `(${qData.score}pts)` : ''}
                        </span>
                      </td>
                    `;
                  }).join('')}
                  <td style="text-align: center; font-weight: 700;">${row.total_earned} / ${row.total_possible}</td>
                  <td style="text-align: center; color: var(--text-muted);">${row.late_count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      };

      containerEl.innerHTML = renderEmptyState({
        icon: 'table-cells',
        title: 'Select a Homework Set',
        message: 'Choose a homework set from the dropdown menu above to view the submission matrix.'
      });
    } catch (err) {
      containerEl.innerHTML = `<div class="card"><p style="color: var(--status-red);">Error: ${err.message}</p></div>`;
    }
  };

  // TAB 3: Class Health
  const loadHealthTab = async () => {
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/health`);
      const { late_rate_percent, attendance_rate_percent, at_risk_count, at_risk_learners, total_submissions, late_submissions } = res.data;

      document.getElementById('health-late-rate').textContent = `${late_rate_percent}%`;
      document.getElementById('health-late-desc').textContent = `${late_submissions} of ${total_submissions} submissions late`;
      document.getElementById('health-att-rate').textContent = `${attendance_rate_percent}%`;
      document.getElementById('health-risk-count').textContent = at_risk_count;

      const riskContainer = document.getElementById('at-risk-learners-list');
      if (at_risk_learners.length === 0) {
        riskContainer.innerHTML = renderEmptyState({
          icon: 'heart-pulse',
          title: 'Class Health Excellent',
          message: 'No learners are currently flagged as at-risk in this classroom!'
        });
      } else {
        riskContainer.innerHTML = `
          <table>
            <thead>
              <tr>
                <th>Learner Name</th>
                <th>Average Grade</th>
                <th>Late Count</th>
                <th>Alert Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${at_risk_learners.map(l => `
                <tr>
                  <td>
                    <div style="font-weight: 700;">${l.full_name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${l.email}</div>
                  </td>
                  <td style="font-weight: 600;">${l.avg_score !== null ? `${l.avg_score}%` : 'N/A'}</td>
                  <td style="color: var(--text-muted);">${l.late_count}</td>
                  <td>
                    <span class="badge ${l.highest_alert === 'red' ? 'badge-red' : 'badge-yellow'}">
                      <i class="fa-solid fa-triangle-exclamation"></i> ${(l.highest_alert || 'AT-RISK').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    ${['instructor', 'TA'].includes((classroomData.user_role || '').toLowerCase()) ? `
                      <button class="btn btn-outline btn-sm" onclick="openAlertModalForUser(${l.user_id})">
                        <i class="fa-solid fa-circle-exclamation"></i> Issue Warning Alert
                      </button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // TAB 4: Members & TA
  const loadMembersTab = async () => {
    const container = document.getElementById('members-list-table');
    container.innerHTML = renderSkeletonRows(3);
    try {
      const res = await apiFetch(`/classrooms/${classroomId}`);
      const members = res.data.members;

      if (members.length === 0) {
        container.innerHTML = renderEmptyState({
          icon: 'users',
          title: 'No Members Enrolled',
          message: 'No members have joined this classroom yet.'
        });
        return;
      }

      const isInstructor = (classroomData.user_role || '').toLowerCase() === 'instructor';

      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Email</th>
              <th>Classroom Role</th>
              <th>Joined Date</th>
              ${isInstructor ? '<th>Role Management</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${members.map(m => `
              <tr>
                <td><strong>${m.full_name}</strong></td>
                <td style="color: var(--text-muted);">${m.email}</td>
                <td>${renderRoleBadge(m.role)}</td>
                <td style="color: var(--text-muted);">${new Date(m.joined_at).toLocaleDateString()}</td>
                ${isInstructor ? `
                  <td>
                    ${m.role !== 'instructor' ? `
                      <button class="btn btn-outline btn-sm" onclick="promptChangeRole(${m.member_id}, '${m.full_name}', '${m.role === 'TA' ? 'learner' : 'TA'}')">
                        ${m.role === 'TA' ? '<i class="fa-solid fa-user-minus"></i> Demote to Learner' : '<i class="fa-solid fa-user-gear"></i> Promote to TA'}
                      </button>
                    ` : '<span style="color: var(--text-muted); font-weight: 500;">Classroom Creator</span>'}
                  </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      container.innerHTML = `<div class="card"><p style="color: var(--status-red);">Error: ${err.message}</p></div>`;
    }
  };

  // TAB 5: Resources
  const loadResourcesTab = async () => {
    const listEl = document.getElementById('resources-list');
    listEl.innerHTML = renderSkeletonRows(2);
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/resources`);
      const resources = res.data;

      if (resources.length === 0) {
        listEl.innerHTML = renderEmptyState({
          icon: 'link',
          title: 'No Shared Resources',
          message: 'No learning resources, documentation, or study links have been posted yet.',
          actionText: '<i class="fa-solid fa-plus-circle"></i> Share Resource',
          actionFn: () => document.getElementById('resource-modal').classList.add('active')
        });
        return;
      }

      const isStaff = ['instructor', 'ta'].includes((classroomData.user_role || '').toLowerCase());

      listEl.innerHTML = resources.map(r => {
        let typeBadge = '';
        const rType = (r.resource_type || 'link').toLowerCase();
        if (rType === 'pdf') {
          typeBadge = `<span class="badge badge-red"><i class="fa-solid fa-file-pdf"></i> PDF</span>`;
        } else if (rType === 'pptx') {
          typeBadge = `<span class="badge badge-yellow"><i class="fa-solid fa-file-powerpoint"></i> PPTX</span>`;
        } else if (rType === 'docx') {
          typeBadge = `<span class="badge badge-blue"><i class="fa-solid fa-file-word"></i> DOCX</span>`;
        } else if (rType === 'text') {
          typeBadge = `<span class="badge badge-gray"><i class="fa-solid fa-file-lines"></i> TEXT</span>`;
        } else {
          typeBadge = `<span class="badge badge-blue"><i class="fa-solid fa-link"></i> LINK</span>`;
        }

        return `
          <div class="card">
            <div class="card-info">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <h4 class="card-title">
                  <a href="${r.resource_url}" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; gap: 0.4rem;">
                    ${r.resource_title} <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.75rem;"></i>
                  </a>
                </h4>
                <div style="display: flex; gap: 0.35rem; align-items: center;">
                  ${typeBadge}
                  ${r.is_approved 
                    ? '<span class="badge badge-green"><i class="fa-solid fa-check-circle"></i> Approved</span>' 
                    : '<span class="badge badge-yellow"><i class="fa-solid fa-clock"></i> Pending</span>'}
                </div>
              </div>
              <p class="card-subtitle">${r.resource_description || 'No description provided.'}</p>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Shared by <strong>${r.submitter_name}</strong></div>
            </div>

            ${!r.is_approved && isStaff ? `
              <div style="margin-top: 1rem; pt: 1rem; border-top: 1px solid var(--border-color);">
                <button class="btn btn-primary btn-sm btn-block" onclick="approveRes(${r.resource_id})">
                  <i class="fa-solid fa-check"></i> Approve Resource
                </button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    } catch (err) {
      listEl.innerHTML = `<div class="card"><p style="color: var(--status-red);">Error: ${err.message}</p></div>`;
    }
  };

  // TAB 6: Alerts
  const loadAlertsTab = async () => {
    const container = document.getElementById('alerts-list-table');
    container.innerHTML = renderSkeletonRows(3);
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/alerts`);
      const alerts = res.data;

      if (alerts.length === 0) {
        container.innerHTML = renderEmptyState({
          icon: 'triangle-exclamation',
          title: 'No Warning Alerts Logged',
          message: 'There are no active or resolved warning alerts for this classroom.'
        });
        return;
      }

      const isStaff = ['instructor', 'ta'].includes((classroomData.user_role || '').toLowerCase());

      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Learner Name</th>
              <th>Severity</th>
              <th>Warning Message</th>
              <th>Issued By</th>
              <th>Status</th>
              ${isStaff ? '<th>Action</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${alerts.map(a => `
              <tr>
                <td><strong>${a.learner_name}</strong></td>
                <td>
                  <span class="badge ${a.alert_type === 'red' ? 'badge-red' : 'badge-yellow'}">
                    <i class="fa-solid fa-triangle-exclamation"></i> ${a.alert_type.toUpperCase()}
                  </span>
                </td>
                <td style="color: var(--text-main);">${a.alert_message}</td>
                <td style="color: var(--text-muted);">${a.instructor_name}</td>
                <td>
                  ${a.is_resolved 
                    ? '<span class="badge badge-green"><i class="fa-solid fa-check"></i> Resolved</span>' 
                    : '<span class="badge badge-red"><i class="fa-solid fa-circle-exclamation"></i> Active</span>'}
                </td>
                ${isStaff ? `
                  <td>
                    ${!a.is_resolved 
                      ? `<button class="btn btn-outline btn-sm" onclick="resolveAlertItem(${a.alert_id})"><i class="fa-solid fa-check"></i> Mark Resolved</button>` 
                      : '<span style="color: var(--text-muted);">Resolved</span>'}
                  </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      container.innerHTML = `<div class="card"><p style="color: var(--status-red);">Error: ${err.message}</p></div>`;
    }
  };

  // TAB 7: Live Sessions
  const loadLiveTab = async () => {
    const listEl = document.getElementById('live-sessions-list');
    listEl.innerHTML = renderSkeletonRows(2);
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/live-sessions`);
      const sessions = res.data;

      const userRole = (classroomData.user_role || '').toLowerCase();
      const isStaff = userRole === 'instructor' || userRole === 'ta';

      if (sessions.length === 0) {
        listEl.innerHTML = renderEmptyState({
          icon: 'video',
          title: 'No Live Sessions Scheduled',
          message: isStaff 
            ? 'Schedule your first live class lecture with interactive video stream and attendance tracking.'
            : 'No live class sessions are currently scheduled.',
          actionText: isStaff ? '<i class="fa-solid fa-video"></i> Schedule Live Session' : null,
          actionFn: isStaff ? () => document.getElementById('session-modal').classList.add('active') : null
        });
        return;
      }

      listEl.innerHTML = sessions.map(s => {
        const isLiveNow = s.is_active && !s.ended_at && s.started_at !== null;
        const isEnded = s.ended_at !== null;
        const isScheduled = !isLiveNow && !isEnded;

        let statusBadge = '';
        if (isLiveNow) {
          statusBadge = `<span class="badge badge-green pulsing-btn" style="padding: 0.25rem 0.6rem;"><i class="fa-solid fa-circle-dot fa-beat-fade"></i> LIVE NOW</span>`;
        } else if (isEnded) {
          statusBadge = `<span class="badge badge-gray"><i class="fa-solid fa-flag-checkered"></i> Ended</span>`;
        } else {
          statusBadge = `<span class="badge badge-blue"><i class="fa-solid fa-calendar"></i> Scheduled</span>`;
        }

        let actionArea = '';
        if (isStaff) {
          if (isScheduled) {
            actionArea = `
              <button class="btn btn-primary btn-block" style="margin-top: 1.25rem;" onclick="startLiveSessionItem(${s.session_id})">
                <i class="fa-solid fa-play"></i> Start Now
              </button>
            `;
          } else if (isLiveNow) {
            actionArea = `
              <div style="display: flex; gap: 0.5rem; margin-top: 1.25rem;">
                <a href="/live.html?id=${s.session_id}" class="btn btn-warning btn-block pulsing-btn" style="flex: 2; text-decoration: none; display: inline-flex; justify-content: center; align-items: center; gap: 0.5rem;">
                  <i class="fa-solid fa-video"></i> Join Live Class Room
                </a>
                <button class="btn btn-secondary" style="flex: 1; border-color: var(--status-red); color: var(--status-red);" onclick="endLiveSessionItem(${s.session_id})">
                  <i class="fa-solid fa-stop"></i> End Session
                </button>
              </div>
            `;
          } else {
            actionArea = `
              <button class="btn btn-secondary btn-block" style="margin-top: 1.25rem;" disabled>
                <i class="fa-solid fa-check"></i> Session Ended
              </button>
            `;
          }
        } else {
          if (isLiveNow) {
            actionArea = `
              <a href="/live.html?id=${s.session_id}" class="btn btn-warning btn-block pulsing-btn" style="margin-top: 1.25rem; text-decoration: none; display: inline-flex; justify-content: center; align-items: center; gap: 0.5rem;">
                <i class="fa-solid fa-video"></i> Join Live Class Room
              </a>
            `;
          } else {
            actionArea = `
              <div style="margin-top: 1.25rem; padding: 0.65rem; background: var(--table-head-bg); border-radius: 8px; font-size: 0.85rem; color: var(--text-muted); text-align: center;">
                <i class="fa-solid fa-info-circle"></i> ${isEnded ? 'This live class session has ended.' : 'Class has not started yet. You will be notified when it goes live.'}
              </div>
            `;
          }
        }

        return `
          <div class="card">
            <div class="card-info">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <h4 class="card-title">${escapeHtml(s.session_title)}</h4>
                ${statusBadge}
              </div>
              <p class="card-subtitle">${escapeHtml(s.session_description || 'Live class lecture & interactive Q&A session.')}</p>
              
              <div class="card-details">
                <div class="detail-row">
                  <strong>Scheduled Time:</strong>
                  <span>${new Date(s.scheduled_time).toLocaleString()}</span>
                </div>
                <div class="detail-row">
                  <strong>Expected Duration:</strong>
                  <span>${s.expected_duration} Minutes</span>
                </div>
              </div>
            </div>

            ${actionArea}
          </div>
        `;
      }).join('');
    } catch (err) {
      listEl.innerHTML = `<div class="card"><p style="color: var(--status-red);">Error: ${err.message}</p></div>`;
    }
  };


  // TAB 8: Plagiarism Scan
  const loadPlagiarismTab = async () => {
    const container = document.getElementById('plagiarism-flags-list');
    container.innerHTML = renderSkeletonRows(3);
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/plagiarism-flags`);
      const flags = res.data;

      if (flags.length === 0) {
        container.innerHTML = renderEmptyState({
          icon: 'magnifying-glass-chart',
          title: 'No Plagiarism Flags Detected',
          message: 'Run a code hash similarity scan across learner submissions to detect potential plagiarism.'
        });
        return;
      }

      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Homework / Question</th>
              <th>Learner 1</th>
              <th>Learner 2</th>
              <th>Similarity Match</th>
              <th>Review Status</th>
            </tr>
          </thead>
          <tbody>
            ${flags.map(f => `
              <tr>
                <td>
                  <div style="font-weight: 700;">${f.homework_title}</div>
                  <div style="font-size: 0.8rem; color: var(--text-muted);">${f.question_text}</div>
                </td>
                <td>${f.learner_1_name}</td>
                <td>${f.learner_2_name}</td>
                <td>
                  <span class="badge badge-red"><i class="fa-solid fa-copy"></i> ${f.similarity_score}% Match</span>
                </td>
                <td>
                  ${f.is_reviewed 
                    ? '<span class="badge badge-green"><i class="fa-solid fa-check"></i> Reviewed</span>' 
                    : '<span class="badge badge-yellow"><i class="fa-solid fa-clock"></i> Unreviewed</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      container.innerHTML = `<div class="card"><p style="color: var(--status-red);">Error: ${err.message}</p></div>`;
    }
  };

  // TAB: Student Info Roster & Attendance (Staff Only)
  let cachedStudentInfoList = [];

  const loadStudentInfoTab = async () => {
    const container = document.getElementById('student-info-table-container');
    container.innerHTML = renderSkeletonRows(3);
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/student-info`);
      cachedStudentInfoList = res.data.students || [];
      renderStudentInfoTable();
    } catch (err) {
      container.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--status-red);"><i class="fa-solid fa-triangle-exclamation"></i> Error loading student info: ${err.message}</div>`;
    }
  };

  const renderStudentInfoTable = () => {
    const container = document.getElementById('student-info-table-container');
    if (!container) return;

    const searchVal = (document.getElementById('student-search-input')?.value || '').toLowerCase().trim();
    const sortVal = document.getElementById('student-sort-select')?.value || 'name_asc';

    let filtered = cachedStudentInfoList.filter(s => {
      const name = (s.full_name || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const phone = (s.phone_number || '').toLowerCase();
      return name.includes(searchVal) || email.includes(searchVal) || phone.includes(searchVal);
    });

    filtered.sort((a, b) => {
      if (sortVal === 'name_asc') return a.full_name.localeCompare(b.full_name);
      if (sortVal === 'name_desc') return b.full_name.localeCompare(a.full_name);
      if (sortVal === 'att_desc') {
        const valA = a.attendance_percentage === null ? -1 : a.attendance_percentage;
        const valB = b.attendance_percentage === null ? -1 : b.attendance_percentage;
        return valB - valA;
      }
      if (sortVal === 'att_asc') {
        const valA = a.attendance_percentage === null ? 999 : a.attendance_percentage;
        const valB = b.attendance_percentage === null ? 999 : b.attendance_percentage;
        return valA - valB;
      }
      return 0;
    });

    if (filtered.length === 0) {
      container.innerHTML = renderEmptyState({
        icon: 'user-graduate',
        title: 'No Students Found',
        message: 'No enrolled learners match your search criteria.'
      });
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Learner Name & ID</th>
            <th>Email</th>
            <th>Phone Number</th>
            <th>Attendance %</th>
            <th>Quick Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(s => {
            let attBadge = '';
            if (s.attendance_percentage === null) {
              attBadge = `<span class="badge badge-gray"><i class="fa-solid fa-minus-circle"></i> N/A (No Sessions)</span>`;
            } else if (s.attendance_percentage >= 80) {
              attBadge = `<span class="badge badge-green"><i class="fa-solid fa-circle-check"></i> ${s.attendance_percentage}% (${s.present_sessions}/${s.total_sessions})</span>`;
            } else if (s.attendance_percentage >= 50) {
              attBadge = `<span class="badge badge-yellow"><i class="fa-solid fa-triangle-exclamation"></i> ${s.attendance_percentage}% (${s.present_sessions}/${s.total_sessions})</span>`;
            } else {
              attBadge = `<span class="badge badge-red"><i class="fa-solid fa-circle-exclamation"></i> ${s.attendance_percentage}% (${s.present_sessions}/${s.total_sessions})</span>`;
            }

            return `
              <tr>
                <td>
                  <div style="font-weight: 700; color: var(--text-main);">${escapeHtml(s.full_name)}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">ID: #${s.user_id}</div>
                </td>
                <td style="color: var(--text-main);">${escapeHtml(s.email)}</td>
                <td style="font-family: var(--font-mono); color: var(--text-main);">${s.phone_number ? escapeHtml(s.phone_number) : '<span style="color: var(--text-muted);">N/A</span>'}</td>
                <td>${attBadge}</td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="openAlertModalForUser(${s.user_id})">
                    <i class="fa-solid fa-circle-exclamation" style="color: var(--status-orange);"></i> Issue Alert
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  };

  document.getElementById('student-search-input')?.addEventListener('input', renderStudentInfoTable);
  document.getElementById('student-sort-select')?.addEventListener('change', renderStudentInfoTable);

  // TAB: Messages (Group Chat & Direct Messages)
  let activeChatChannel = { type: 'group' };
  let chatPollingInterval = null;

  const loadMessagesTab = async () => {
    await loadDmContactsList();
    await loadActiveChatMessages();
    startChatPolling();
  };

  const loadDmContactsList = async () => {
    const listEl = document.getElementById('dm-contacts-list');
    if (!listEl) return;
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/dm-contacts`);
      const contacts = res.data || [];

      if (contacts.length === 0) {
        listEl.innerHTML = '<p style="font-size: 0.75rem; color: var(--text-muted); padding: 0.5rem;">No contacts available</p>';
        return;
      }

      listEl.innerHTML = contacts.map(c => {
        const isSelected = activeChatChannel.type === 'dm' && activeChatChannel.targetUserId == c.user_id;
        let roleBadge = '';
        const r = (c.role || '').toLowerCase();
        if (r === 'instructor') roleBadge = '<span class="badge role-badge-instructor" style="font-size: 0.65rem;">Instructor</span>';
        else if (r === 'ta') roleBadge = '<span class="badge role-badge-ta" style="font-size: 0.65rem;">TA</span>';
        else roleBadge = '<span class="badge role-badge-learner" style="font-size: 0.65rem;">Learner</span>';

        return `
          <button class="btn btn-outline btn-block ${isSelected ? 'active' : ''}" style="justify-content: space-between; font-size: 0.8rem; padding: 0.45rem 0.65rem; text-align: left;" onclick="selectChatChannel('dm', ${c.user_id}, '${escapeHtml(c.full_name)}', '${c.role}')">
            <span style="display: flex; align-items: center; gap: 0.4rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <i class="fa-solid fa-user" style="color: var(--primary-color);"></i>
              <span style="font-weight: 600;">${escapeHtml(c.full_name)}</span>
            </span>
            <div style="display: flex; align-items: center; gap: 0.3rem;">
              ${c.unread_count > 0 ? `<span class="badge badge-red" style="font-size: 0.65rem;">${c.unread_count}</span>` : ''}
              ${roleBadge}
            </div>
          </button>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading DM contacts:', err);
      listEl.innerHTML = `<p style="font-size: 0.75rem; color: var(--status-red); padding: 0.5rem;">Error loading contacts: ${escapeHtml(err.message)}</p>`;
    }
  };

  window.selectChatChannel = async (type, targetUserId = null, targetUserName = '', targetUserRole = '') => {
    if (type === 'group') {
      activeChatChannel = { type: 'group' };
      document.getElementById('channel-group-btn')?.classList.add('active');
      document.getElementById('active-chat-title').innerHTML = `<i class="fa-solid fa-comments" style="color: var(--primary-color);"></i> Class Group Chat`;
      document.getElementById('active-chat-subtitle').textContent = 'All Enrolled Members';
    } else {
      activeChatChannel = { type: 'dm', targetUserId, targetUserName, targetUserRole };
      document.getElementById('channel-group-btn')?.classList.remove('active');
      document.getElementById('active-chat-title').innerHTML = `<i class="fa-solid fa-user" style="color: var(--primary-color);"></i> ${targetUserName}`;
      document.getElementById('active-chat-subtitle').textContent = `Direct Message (${targetUserRole.toUpperCase()})`;
    }

    await loadDmContactsList();
    await loadActiveChatMessages();
  };

  const loadActiveChatMessages = async () => {
    const messagesBox = document.getElementById('chat-messages-box');
    if (!messagesBox) return;

    try {
      let endpoint = activeChatChannel.type === 'group' 
        ? `/classrooms/${classroomId}/messages`
        : `/classrooms/${classroomId}/dm/${activeChatChannel.targetUserId}`;

      const res = await apiFetch(endpoint);
      const messages = activeChatChannel.type === 'group' ? res.data : (res.data?.messages || []);
      const currentUserId = getActiveUserId();

      if (messages.length === 0) {
        messagesBox.innerHTML = `
          <div style="text-align: center; color: var(--text-muted); padding: 2rem 1rem;">
            <i class="fa-solid fa-comments" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.4;"></i>
            <p style="font-size: 0.85rem; margin: 0;">No messages yet. Send a message to start the conversation!</p>
          </div>
        `;
        return;
      }

      messagesBox.innerHTML = messages.map(m => {
        const isSelf = m.sender_id == currentUserId;
        const timeStr = new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let roleBadge = '';
        if (m.sender_role) {
          const r = m.sender_role.toLowerCase();
          if (r === 'instructor') roleBadge = '<span class="badge role-badge-instructor" style="font-size: 0.6rem; padding: 0.1rem 0.3rem;">Instructor</span>';
          else if (r === 'ta') roleBadge = '<span class="badge role-badge-ta" style="font-size: 0.6rem; padding: 0.1rem 0.3rem;">TA</span>';
        }

        if (isSelf) {
          return `
            <div style="align-self: flex-end; max-width: 75%; display: flex; flex-direction: column; align-items: flex-end;">
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.2rem;">You &bull; ${timeStr}</div>
              <div style="background-color: var(--primary-color); color: #ffffff; padding: 0.65rem 0.95rem; border-radius: 14px 14px 2px 14px; font-size: 0.875rem; line-height: 1.4; word-break: break-word; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                ${escapeHtml(m.message_text)}
              </div>
            </div>
          `;
        } else {
          return `
            <div style="align-self: flex-start; max-width: 75%; display: flex; flex-direction: column; align-items: flex-start;">
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.2rem; display: flex; align-items: center; gap: 0.3rem;">
                <span style="font-weight: 700; color: var(--text-main);">${escapeHtml(m.sender_name || 'Member')}</span>
                ${roleBadge}
                <span>&bull; ${timeStr}</span>
              </div>
              <div style="background-color: var(--table-head-bg); color: var(--text-main); border: 1px solid var(--border-color); padding: 0.65rem 0.95rem; border-radius: 14px 14px 14px 2px; font-size: 0.875rem; line-height: 1.4; word-break: break-word;">
                ${escapeHtml(m.message_text)}
              </div>
            </div>
          `;
        }
      }).join('');

      messagesBox.scrollTop = messagesBox.scrollHeight;
    } catch (err) {
      console.error('Error loading chat messages:', err);
      messagesBox.innerHTML = `
        <div style="text-align: center; color: var(--status-red); padding: 2rem 1rem;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
          <p style="font-size: 0.85rem; margin: 0;">Failed to load messages: ${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  };

  // Handle send message form submit
  document.getElementById('chat-send-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    try {
      let endpoint = activeChatChannel.type === 'group'
        ? `/classrooms/${classroomId}/messages`
        : `/classrooms/${classroomId}/dm/${activeChatChannel.targetUserId}`;

      await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ message_text: text })
      });

      input.value = '';
      await loadActiveChatMessages();
      await updateUnreadDmBadge();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Check unread DM count & update sidebar badge
  const updateUnreadDmBadge = async () => {
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/dm/unread-count`);
      const unreadCount = res.data?.unread_count || 0;
      const badge = document.getElementById('unread-dm-badge');
      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
          badge.style.display = 'inline-flex';
        } else {
          badge.style.display = 'none';
        }
      }
    } catch (err) {
      // Silent catch
    }
  };

  // Auto-polling setup (every 10 seconds)
  const startChatPolling = () => {
    if (chatPollingInterval) clearInterval(chatPollingInterval);
    updateUnreadDmBadge();

    chatPollingInterval = setInterval(async () => {
      await updateUnreadDmBadge();
      const activeTab = document.querySelector('.tab-content.active');
      if (activeTab && activeTab.id === 'tab-messages') {
        await loadActiveChatMessages();
      }
    }, 10000);
  };

  // Start initial unread count check
  updateUnreadDmBadge();

  // TAB 9: Enrollment Requests (Instructor Only)
  const loadRequestsTab = async () => {
    const container = document.getElementById('enrollment-requests-table');
    container.innerHTML = renderSkeletonRows(3);
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/enrollment-requests`);
      const requests = res.data;

      if (requests.length === 0) {
        container.innerHTML = renderEmptyState({
          icon: 'user-clock',
          title: 'No Enrollment Requests',
          message: 'There are no pending or reviewed paid enrollment requests for this course.'
        });
        return;
      }

      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Payment Method</th>
              <th>Payer Phone</th>
              <th>Transaction ID</th>
              <th>Requested Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${requests.map(r => {
              let statusBadge = '';
              if (r.status === 'pending') {
                statusBadge = `<span class="badge badge-yellow"><i class="fa-solid fa-clock"></i> Pending Approval</span>`;
              } else if (r.status === 'approved') {
                statusBadge = `<span class="badge badge-green"><i class="fa-solid fa-circle-check"></i> Approved</span>`;
              } else {
                statusBadge = `<span class="badge badge-red"><i class="fa-solid fa-circle-xmark"></i> Rejected</span>`;
              }

              return `
                <tr>
                  <td>
                    <div style="font-weight: 700;">${r.student_name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${r.student_email}</div>
                  </td>
                  <td><span class="badge badge-blue">${r.payment_method}</span></td>
                  <td><code>${r.payer_phone_number || 'N/A'}</code></td>
                  <td><code style="font-weight: 700; color: var(--primary-color);">${r.transaction_id}</code></td>
                  <td style="color: var(--text-muted);">${new Date(r.requested_at).toLocaleString()}</td>
                  <td>${statusBadge}</td>
                  <td>
                    ${r.status === 'pending' ? `
                      <div style="display: flex; gap: 0.4rem;">
                        <button class="btn btn-primary btn-sm" onclick="approveEnrollment(${r.request_id})">
                          <i class="fa-solid fa-check"></i> Approve
                        </button>
                        <button class="btn btn-outline btn-sm" style="color: var(--status-red); border-color: var(--status-red);" onclick="rejectEnrollment(${r.request_id})">
                          <i class="fa-solid fa-xmark"></i> Reject
                        </button>
                      </div>
                    ` : `<span style="font-size: 0.82rem; color: var(--text-muted);">Reviewed by ${r.reviewer_name || 'Instructor'}</span>`}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      container.innerHTML = `<div class="card"><p style="color: var(--status-red);">Error: ${err.message}</p></div>`;
    }
  };

  window.approveEnrollment = async (requestId) => {
    try {
      await apiFetch(`/enrollment-requests/${requestId}/approve`, { method: 'PUT' });
      showToast('Enrollment request approved! Student granted course access.', 'success');
      loadRequestsTab();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.rejectEnrollment = async (requestId) => {
    try {
      await apiFetch(`/enrollment-requests/${requestId}/reject`, { method: 'PUT' });
      showToast('Enrollment request rejected.', 'success');
      loadRequestsTab();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // TAB: Consolidated Gradings (Staff Only)
  const loadGradingsTab = async () => {
    const container = document.getElementById('gradings-table-container');
    if (!container) return;

    container.innerHTML = renderSkeletonRows(3);

    const filterVal = document.getElementById('gradings-filter-select')?.value || 'all';
    const sortVal = document.getElementById('gradings-sort-select')?.value || 'date';

    try {
      const res = await apiFetch(`/classrooms/${classroomId}/gradings?filter=${filterVal}&sort=${sortVal}`);
      const submissions = res.data || [];

      if (submissions.length === 0) {
        container.innerHTML = renderEmptyState({
          icon: 'graduation-cap',
          title: 'No Homework Submissions',
          message: 'No submissions found matching your selected filter criteria.'
        });
        return;
      }

      container.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>Learner</th>
              <th>Homework</th>
              <th>Question</th>
              <th>Submitted At</th>
              <th>Format</th>
              <th>Status / Score</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${submissions.map(s => {
              const subDate = new Date(s.submitted_at).toLocaleString();
              const isGraded = s.is_graded;
              const scoreBadge = isGraded
                ? `<span class="badge badge-green">${s.score} / ${s.max_score} pts</span>`
                : `<span class="badge badge-yellow">Ungraded</span>`;
              const typeBadge = `<span class="badge badge-blue" style="text-transform: uppercase;">${s.submission_type || 'text'}</span>`;
              const lateBadge = s.is_late ? `<span class="badge badge-red" style="font-size:0.7rem; margin-left:0.3rem;">LATE</span>` : '';

              return `
                <tr>
                  <td>
                    <strong>${escapeHtml(s.learner_name)}</strong>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(s.learner_email)}</div>
                  </td>
                  <td><strong>${escapeHtml(s.homework_title)}</strong></td>
                  <td><div style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(s.question_title)}</div></td>
                  <td>${subDate} ${lateBadge}</td>
                  <td>${typeBadge}</td>
                  <td>${scoreBadge}</td>
                  <td>
                    <a href="/homework.html?id=${s.homework_id}" class="btn btn-outline btn-sm">
                      <i class="fa-solid fa-pen-to-square"></i> Grade & Review
                    </a>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      console.error('Error loading gradings tab:', err);
      container.innerHTML = `<div class="card"><p style="color:var(--status-red);">Failed loading gradings: ${err.message}</p></div>`;
    }
  };

  const gradingsFilterSelect = document.getElementById('gradings-filter-select');
  const gradingsSortSelect = document.getElementById('gradings-sort-select');
  if (gradingsFilterSelect) gradingsFilterSelect.onchange = () => loadGradingsTab();
  if (gradingsSortSelect) gradingsSortSelect.onchange = () => loadGradingsTab();

  // TAB 10: Course Settings (Instructor & Learner View)
  const loadSettingsTab = () => {
    if (!classroomData) return;

    document.getElementById('settings-name').value = classroomData.classroom_name || '';
    document.getElementById('settings-room-num').value = classroomData.room_number || '';
    document.getElementById('settings-room-pass').value = classroomData.room_password || '';
    document.getElementById('settings-visibility').value = classroomData.visibility || 'private';

    const isPaid = classroomData.is_paid === true || classroomData.is_paid === 1;
    document.getElementById('settings-is-paid').value = isPaid ? 'true' : 'false';
    document.getElementById('settings-price').value = isPaid ? classroomData.price || '' : '';
    document.getElementById('settings-price-group').style.display = isPaid ? 'block' : 'none';

    const threshInput = document.getElementById('settings-threshold');
    if (threshInput) {
      threshInput.value = classroomData.attendance_threshold_percent !== undefined && classroomData.attendance_threshold_percent !== null
        ? classroomData.attendance_threshold_percent
        : 75;
    }

    document.getElementById('settings-cover-url').value = classroomData.cover_photo_url || '';
    document.getElementById('settings-desc').value = classroomData.description || '';

    const userRole = (classroomData.user_role || '').toLowerCase();
    const learnerSettingsCard = document.getElementById('learner-settings-card');
    if (learnerSettingsCard) {
      learnerSettingsCard.style.display = userRole === 'learner' ? 'block' : 'none';
    }
  };

  const settingsIsPaidSelect = document.getElementById('settings-is-paid');
  if (settingsIsPaidSelect) {
    settingsIsPaidSelect.onchange = () => {
      document.getElementById('settings-price-group').style.display = settingsIsPaidSelect.value === 'true' ? 'block' : 'none';
    };
  }

  const settingsForm = document.getElementById('course-settings-form');
  if (settingsForm) {
    settingsForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('settings-name').value.trim();
      const pass = document.getElementById('settings-room-pass').value.trim();
      const visibility = document.getElementById('settings-visibility').value;
      const isPaid = document.getElementById('settings-is-paid').value === 'true';
      const price = document.getElementById('settings-price').value;
      const threshold = document.getElementById('settings-threshold')?.value;
      const coverUrl = document.getElementById('settings-cover-url').value.trim();
      const desc = document.getElementById('settings-desc').value.trim();
      const errorBox = document.getElementById('settings-error');

      errorBox.style.display = 'none';

      if (!name || !pass) {
        errorBox.textContent = 'Classroom Name and Access Password are required.';
        errorBox.style.display = 'block';
        return;
      }

      if (isPaid && (!price || parseFloat(price) <= 0)) {
        errorBox.textContent = 'Please specify a valid price for paid courses.';
        errorBox.style.display = 'block';
        return;
      }

      try {
        await apiFetch(`/classrooms/${classroomId}/settings`, {
          method: 'PUT',
          body: JSON.stringify({
            classroom_name: name,
            room_password: pass,
            visibility,
            is_paid: isPaid,
            price: isPaid ? price : null,
            attendance_threshold_percent: threshold ? parseInt(threshold, 10) : 75,
            cover_photo_url: coverUrl || null,
            description: desc
          })
        });

        showToast('Course settings updated successfully!', 'success');
        await loadClassroomHeader();
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.style.display = 'block';
        showToast(err.message, 'error');
      }
    };
  }

  // Global actions with Toasts & Confirmation Modals
  window.togglePublish = async (hwId, publish) => {
    try {
      await apiFetch(`/homework/${hwId}/publish`, {
        method: 'PUT',
        body: JSON.stringify({ is_published: publish })
      });
      showToast(publish ? 'Homework published successfully!' : 'Homework unpublished.', 'success');
      loadHomeworkTab();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.promptChangeRole = (memberId, name, newRole) => {
    showConfirmModal({
      title: 'Confirm Role Change',
      message: `Are you sure you want to change ${name}'s role to ${newRole.toUpperCase()}?`,
      confirmText: `Change to ${newRole.toUpperCase()}`,
      confirmClass: 'btn-primary',
      onConfirm: async () => {
        try {
          await apiFetch(`/classrooms/${classroomId}/members/${memberId}/role`, {
            method: 'POST',
            body: JSON.stringify({ role: newRole })
          });
          showToast(`Member role updated to ${newRole.toUpperCase()}`, 'success');
          loadMembersTab();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  };

  window.approveRes = async (resId) => {
    try {
      await apiFetch(`/resources/${resId}/approve`, { method: 'PUT' });
      showToast('Learning resource approved!', 'success');
      loadResourcesTab();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.resolveAlertItem = async (alertId) => {
    try {
      await apiFetch(`/alerts/${alertId}/resolve`, { method: 'PUT' });
      showToast('Warning alert marked as resolved.', 'success');
      loadAlertsTab();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Modal event bindings
  const hwModal = document.getElementById('create-hw-modal');
  const openHwBtn = document.getElementById('open-create-hw-btn');
  const closeHwBtn = document.getElementById('close-hw-modal');
  const cancelHwBtn = document.getElementById('cancel-hw-btn');

  if (openHwBtn) openHwBtn.onclick = () => hwModal.classList.add('active');
  if (closeHwBtn) closeHwBtn.onclick = () => hwModal.classList.remove('active');
  if (cancelHwBtn) cancelHwBtn.onclick = () => hwModal.classList.remove('active');

  document.getElementById('create-hw-form').onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById('hw-title').value.trim();
    const errorBox = document.getElementById('hw-error');
    errorBox.style.display = 'none';

    if (!title) {
      errorBox.textContent = 'Homework Title is required.';
      errorBox.style.display = 'block';
      return;
    }

    try {
      await apiFetch(`/classrooms/${classroomId}/homework`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          description: document.getElementById('hw-desc').value,
          total_points: document.getElementById('hw-points').value,
          deadline: document.getElementById('hw-deadline').value || null,
          is_published: document.getElementById('hw-publish').checked
        })
      });
      hwModal.classList.remove('active');
      document.getElementById('create-hw-form').reset();
      showToast('Homework set created successfully!', 'success');
      loadHomeworkTab();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      showToast(err.message, 'error');
    }
  };

  // Resource Modal
  const resModal = document.getElementById('resource-modal');
  const openResBtn = document.getElementById('open-add-resource-btn');
  const closeResBtn = document.getElementById('close-resource-modal');
  const cancelResBtn = document.getElementById('cancel-res-btn');

  if (openResBtn) openResBtn.onclick = () => resModal.classList.add('active');
  if (closeResBtn) closeResBtn.onclick = () => resModal.classList.remove('active');
  if (cancelResBtn) cancelResBtn.onclick = () => resModal.classList.remove('active');

  const resDropzone = document.getElementById('res-dropzone');
  const resFilePicker = document.getElementById('res-file-picker');
  const resFileStatus = document.getElementById('res-file-status');
  const resUrlInput = document.getElementById('res-url');

  if (resDropzone && resFilePicker) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      resDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      resDropzone.addEventListener(eventName, () => resDropzone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      resDropzone.addEventListener(eventName, () => resDropzone.classList.remove('dragover'), false);
    });

    resDropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        resFilePicker.files = files;
        handleResFileUpload(files[0]);
      }
    });

    resFilePicker.addEventListener('change', () => {
      if (resFilePicker.files && resFilePicker.files[0]) {
        handleResFileUpload(resFilePicker.files[0]);
      }
    });

    async function handleResFileUpload(file) {
      if (!resFileStatus) return;
      resFileStatus.innerHTML = `<span style="color: var(--primary-color); font-size: 0.8rem; font-weight: 600;"><i class="fa-solid fa-spinner fa-spin"></i> Uploading ${file.name}...</span>`;
      try {
        const uploaded = await uploadFileHelper(file);
        if (resUrlInput) resUrlInput.value = uploaded.url;

        const ext = file.name.split('.').pop().toLowerCase();
        const resTypeSelect = document.getElementById('res-type');
        if (resTypeSelect) {
          if (ext === 'pdf') resTypeSelect.value = 'pdf';
          else if (ext === 'pptx') resTypeSelect.value = 'pptx';
          else if (ext === 'docx') resTypeSelect.value = 'docx';
          else resTypeSelect.value = 'text';
        }

        resFileStatus.innerHTML = `
          <div class="file-chip">
            <i class="fa-solid fa-file"></i> Attached: <a href="${uploaded.url}" target="_blank">${uploaded.original_name}</a>
          </div>
        `;
        showToast(`Resource file ${uploaded.original_name} uploaded successfully!`, 'success');
      } catch (err) {
        resFileStatus.innerHTML = `<span style="color: var(--status-red); font-size: 0.8rem;"><i class="fa-solid fa-triangle-exclamation"></i> ${err.message}</span>`;
        showToast(`Upload failed: ${err.message}`, 'error');
      }
    }
  }

  document.getElementById('resource-form').onsubmit = async (e) => {
    e.preventDefault();
    const resTitle = document.getElementById('res-title').value.trim();
    const resUrl = document.getElementById('res-url').value.trim();
    const errorBox = document.getElementById('res-error');
    errorBox.style.display = 'none';

    if (!resTitle || !resUrl) {
      errorBox.textContent = 'Resource Title and URL are required.';
      errorBox.style.display = 'block';
      return;
    }

    try {
      await apiFetch(`/classrooms/${classroomId}/resources`, {
        method: 'POST',
        body: JSON.stringify({
          resource_title: resTitle,
          resource_url: resUrl,
          resource_type: document.getElementById('res-type').value,
          resource_description: document.getElementById('res-desc').value
        })
      });
      resModal.classList.remove('active');
      document.getElementById('resource-form').reset();
      showToast('Resource submitted successfully!', 'success');
      loadResourcesTab();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      showToast(err.message, 'error');
    }
  };

  // Alert Modal
  const alertModal = document.getElementById('alert-modal');
  const alertLearnerSelect = document.getElementById('alert-learner-select');
  const openAlertBtn = document.getElementById('open-issue-alert-btn');
  const closeAlertBtn = document.getElementById('close-alert-modal');
  const cancelAlertBtn = document.getElementById('cancel-alert-btn');

  if (openAlertBtn) {
    openAlertBtn.onclick = async () => {
      const memRes = await apiFetch(`/classrooms/${classroomId}`);
      const learners = memRes.data.members.filter(m => m.role === 'learner');
      alertLearnerSelect.innerHTML = learners.map(l => `<option value="${l.user_id}">${l.full_name} (${l.email})</option>`).join('');
      alertModal.classList.add('active');
    };
  }
  if (closeAlertBtn) closeAlertBtn.onclick = () => alertModal.classList.remove('active');
  if (cancelAlertBtn) cancelAlertBtn.onclick = () => alertModal.classList.remove('active');

  window.openAlertModalForUser = async (userId) => {
    const memRes = await apiFetch(`/classrooms/${classroomId}`);
    const learners = memRes.data.members.filter(m => m.role === 'learner');
    alertLearnerSelect.innerHTML = learners.map(l => `<option value="${l.user_id}" ${l.user_id == userId ? 'selected' : ''}>${l.full_name} (${l.email})</option>`).join('');
    alertModal.classList.add('active');
  };

  document.getElementById('alert-form').onsubmit = async (e) => {
    e.preventDefault();
    const msg = document.getElementById('alert-msg').value.trim();
    const errorBox = document.getElementById('alert-error');
    errorBox.style.display = 'none';

    if (!msg) {
      errorBox.textContent = 'Warning message is required.';
      errorBox.style.display = 'block';
      return;
    }

    try {
      await apiFetch(`/classrooms/${classroomId}/alerts`, {
        method: 'POST',
        body: JSON.stringify({
          learner_id: alertLearnerSelect.value,
          alert_type: document.getElementById('alert-type-select').value,
          alert_message: msg
        })
      });
      alertModal.classList.remove('active');
      document.getElementById('alert-form').reset();
      showToast('Learner warning alert issued successfully!', 'success');
      loadAlertsTab();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      showToast(err.message, 'error');
    }
  };

  // Live Session Modal
  const sessionModal = document.getElementById('session-modal');
  const openSessionBtn = document.getElementById('open-create-session-btn');
  const closeSessionBtn = document.getElementById('close-session-modal');
  const cancelSessionBtn = document.getElementById('cancel-session-btn');

  if (openSessionBtn) openSessionBtn.onclick = () => sessionModal.classList.add('active');
  if (closeSessionBtn) closeSessionBtn.onclick = () => sessionModal.classList.remove('active');
  if (cancelSessionBtn) cancelSessionBtn.onclick = () => sessionModal.classList.remove('active');

  document.getElementById('session-form').onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById('session-title-input').value.trim();
    const errorBox = document.getElementById('session-error');
    errorBox.style.display = 'none';

    if (!title) {
      errorBox.textContent = 'Session Title is required.';
      errorBox.style.display = 'block';
      return;
    }

    try {
      await apiFetch(`/classrooms/${classroomId}/live-sessions`, {
        method: 'POST',
        body: JSON.stringify({
          session_title: title,
          session_description: document.getElementById('session-desc-input').value,
          scheduled_time: document.getElementById('session-time-input').value,
          expected_duration: document.getElementById('session-duration-input').value
        })
      });
      sessionModal.classList.remove('active');
      document.getElementById('session-form').reset();
      showToast('Live class session scheduled!', 'success');
      loadLiveTab();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      showToast(err.message, 'error');
    }
  };

  // Plagiarism Scan Trigger
  const runPlagBtn = document.getElementById('run-plagiarism-btn');
  if (runPlagBtn) {
    runPlagBtn.onclick = async () => {
      showToast('Running plagiarism code hash scan across classroom submissions...', 'info');
      try {
        const res = await apiFetch(`/classrooms/${classroomId}/plagiarism-check`, { method: 'POST' });
        showToast(res.message, 'success');
        loadPlagiarismTab();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  // Leave Classroom Modal & Handlers
  const leaveModal = document.getElementById('leave-classroom-modal');
  const openLeaveBtn = document.getElementById('leave-classroom-btn');
  const closeLeaveBtn = document.getElementById('close-leave-modal');
  const cancelLeaveBtn = document.getElementById('cancel-leave-btn');
  const confirmLeaveBtn = document.getElementById('confirm-leave-btn');

  if (openLeaveBtn) openLeaveBtn.onclick = () => leaveModal.classList.add('active');
  if (closeLeaveBtn) closeLeaveBtn.onclick = () => leaveModal.classList.remove('active');
  if (cancelLeaveBtn) cancelLeaveBtn.onclick = () => leaveModal.classList.remove('active');

  if (confirmLeaveBtn) {
    confirmLeaveBtn.onclick = async () => {
      try {
        await apiFetch(`/classrooms/${classroomId}/leave`, { method: 'DELETE' });
        leaveModal.classList.remove('active');
        showToast('You have successfully left the classroom.', 'success');
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 800);
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  loadClassroomHeader();
});

window.startLiveSessionItem = async (sessionId) => {
  try {
    await apiFetch(`/live-sessions/${sessionId}/start`, { method: 'PUT' });
    showToast('Live session started! Learners notified.', 'success');
    window.location.reload();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.endLiveSessionItem = async (sessionId) => {
  if (!confirm('Are you sure you want to end this live session?')) return;
  try {
    await apiFetch(`/live-sessions/${sessionId}/end`, { method: 'PUT' });
    showToast('Live session ended.', 'info');
    window.location.reload();
  } catch (err) {
    showToast(err.message, 'error');
  }
};


