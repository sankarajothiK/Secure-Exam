const Employee = require('../models/Employee');
const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');

// Get Dashboard Statistics
const getDashboardStats = async (req, res) => {
  try {
    const totalEmployees = await Employee.countDocuments();
    const totalExams = await Exam.countDocuments();
    
    const completedExams = await ExamAttempt.countDocuments({ status: 'Completed' });
    const pendingExams = await ExamAttempt.countDocuments({ status: 'Terminated' }); // Terminated is proctor failures

    // Average Score
    const avgScoreAgg = await ExamAttempt.aggregate([
      { $group: { _id: null, avgScore: { $avg: "$score" } } }
    ]);
    const averageScore = avgScoreAgg.length > 0 ? parseFloat(avgScoreAgg[0].avgScore.toFixed(2)) : 0;

    // Latest Registrations
    const latestRegistrations = await Employee.find({}, 'name email mobile createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    return res.status(200).json({
      totalEmployees,
      totalExams,
      completedExams,
      pendingExams,
      averageScore,
      latestRegistrations,
    });
  } catch (error) {
    console.error('Stats query error:', error);
    return res.status(500).json({ message: 'Internal Server Error loading dashboard statistics' });
  }
};

// Get Employee Results list with filters, searches, and paginations
const getResults = async (req, res) => {
  try {
    const { search, filter } = req.query;
    let query = {};

    // 1. Process Search Query
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      
      // Find employees matching details
      const matchedEmployees = await Employee.find({
        $or: [
          { name: regex },
          { email: regex },
          { mobile: regex }
        ]
      }, '_id');

      // Find exams matching title
      const matchedExams = await Exam.find({ title: regex }, '_id');

      query.$or = [
        { employee: { $in: matchedEmployees.map(e => e._id) } },
        { exam: { $in: matchedExams.map(ex => ex._id) } }
      ];
    }

    // 2. Process Status Filters
    if (filter) {
      if (filter === 'Completed') {
        query.status = 'Completed';
      } else if (filter === 'Pending') {
        query.status = 'Terminated';
      } else if (filter === 'Passed') {
        query.status = 'Completed';
        query.$expr = { $gte: [{ $divide: ["$score", "$totalQuestions"] }, 0.5] }; // 50% passing criteria
      } else if (filter === 'Failed') {
        query.$or = [
          { status: 'Terminated' },
          {
            status: 'Completed',
            $expr: { $lt: [{ $divide: ["$score", "$totalQuestions"] }, 0.5] }
          }
        ];
      }
    }

    // 3. Query Database
    const attempts = await ExamAttempt.find(query)
      .populate('employee', 'name email mobile selfieUrl aadhaarUrl')
      .populate('exam', 'title duration')
      .sort({ submittedAt: -1 });

    // Format attempts
    const formattedResults = attempts.map(attempt => {
      const e = attempt.employee || { name: 'Deleted Employee', email: '', mobile: '', selfieUrl: '', aadhaarUrl: '' };
      const ex = attempt.exam || { title: 'Deleted Assessment', duration: 0 };
      
      const percentage = attempt.totalQuestions > 0 
        ? Math.round((attempt.score / attempt.totalQuestions) * 100) 
        : 0;

      return {
        _id: attempt._id,
        name: e.name,
        email: e.email,
        mobile: e.mobile,
        selfieUrl: e.selfieUrl,
        aadhaarUrl: e.aadhaarUrl,
        examName: ex.title,
        submissionTime: attempt.submittedAt,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        percentage,
        correct: attempt.answers.filter(a => a.isCorrect).length,
        wrong: attempt.answers.filter(a => !a.isCorrect && a.selectedOption !== '').length,
        status: attempt.status,
        reason: attempt.reason,
      };
    });

    return res.status(200).json(formattedResults);
  } catch (error) {
    console.error('Results query error:', error);
    return res.status(500).json({ message: 'Internal Server Error loading results' });
  }
};

// Get single exam attempt details
const getResultDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const attempt = await ExamAttempt.findById(id)
      .populate('employee', 'name email mobile selfieUrl aadhaarUrl')
      .populate('exam', 'title duration questions');

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt record not found' });
    }

    const emp = attempt.employee || { name: 'Deleted Employee', email: '', mobile: '', selfieUrl: '', aadhaarUrl: '' };
    const ex = attempt.exam || { title: 'Deleted Assessment', duration: 0, questions: [] };

    // Format answers detail
    const detailsAnswers = attempt.answers.map((employeeAns) => {
      const originalQ = ex.questions[employeeAns.questionIndex] || { questionText: 'Deleted Question', options: ['', '', '', ''], correctAnswer: 'A' };
      return {
        questionText: originalQ.questionText,
        options: originalQ.options,
        correctAnswer: originalQ.correctAnswer,
        selectedOption: employeeAns.selectedOption,
        isCorrect: employeeAns.isCorrect,
      };
    });

    const percentage = attempt.totalQuestions > 0 
      ? Math.round((attempt.score / attempt.totalQuestions) * 100) 
      : 0;

    const timeTakenSeconds = Math.round((attempt.submittedAt - attempt.startedAt) / 1000);
    const minutes = Math.floor(timeTakenSeconds / 60);
    const seconds = timeTakenSeconds % 60;
    const timeTakenStr = `${minutes}m ${seconds}s`;

    return res.status(200).json({
      _id: attempt._id,
      employeeDetails: {
        name: emp.name,
        email: emp.email,
        mobile: emp.mobile,
        selfieUrl: emp.selfieUrl,
        aadhaarUrl: emp.aadhaarUrl,
      },
      examName: ex.title,
      submissionTime: attempt.submittedAt,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      percentage,
      timeTaken: timeTakenStr,
      tabSwitchCount: attempt.tabSwitchCount,
      status: attempt.status,
      reason: attempt.reason,
      answers: detailsAnswers,
    });
  } catch (error) {
    console.error('Result detail query error:', error);
    return res.status(500).json({ message: 'Internal Server Error loading detail report' });
  }
};

// Export CSV report of results
const exportResultsCSV = async (req, res) => {
  try {
    const attempts = await ExamAttempt.find()
      .populate('employee', 'name email mobile')
      .populate('exam', 'title')
      .sort({ submittedAt: -1 });

    let csvContent = 'Employee Name,Email,Mobile,Assessment Title,Submission Time,Score,Total Questions,Percentage,Status,Reason\n';

    for (const attempt of attempts) {
      const emp = attempt.employee || { name: 'N/A', email: 'N/A', mobile: 'N/A' };
      const ex = attempt.exam || { title: 'N/A' };
      const percentage = attempt.totalQuestions > 0 
        ? Math.round((attempt.score / attempt.totalQuestions) * 100) 
        : 0;

      const name = `"${emp.name.replace(/"/g, '""')}"`;
      const email = `"${emp.email.replace(/"/g, '""')}"`;
      const mobile = `"${emp.mobile.replace(/"/g, '""')}"`;
      const examName = `"${ex.title.replace(/"/g, '""')}"`;
      const timeStr = `"${attempt.submittedAt.toISOString()}"`;
      const reason = `"${(attempt.reason || '').replace(/"/g, '""')}"`;

      csvContent += `${name},${email},${mobile},${examName},${timeStr},${attempt.score},${attempt.totalQuestions},${percentage}%,${attempt.status},${reason}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=assessment_results_${Date.now()}.csv`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('CSV export error:', error);
    return res.status(500).json({ message: 'Internal Server Error exporting CSV report' });
  }
};

module.exports = {
  getDashboardStats,
  getResults,
  getResultDetails,
  exportResultsCSV,
};
