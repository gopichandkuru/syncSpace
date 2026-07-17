const axios = require('axios');

// Map frontend languages to Wandbox compiler names
const compilerMap = {
  javascript: 'nodejs-18.20.4',
  typescript: 'typescript-5.6.2',
  python: 'cpython-3.14.0',
  java: 'openjdk-jdk-21+35',
  c: 'gcc-head-c',
  cpp: 'gcc-head',
  csharp: 'dotnetcore-6.0.425',
  go: 'go-1.14.15',
  rust: 'rust-1.64.0',
  php: 'php-5.6.40',
  'node.js': 'nodejs-18.20.4'
};

/**
 * Execute code using Wandbox API
 * @route POST /api/v1/execute
 */
exports.executeCode = async (req, res, next) => {
  try {
    const { language, code } = req.body;

    if (!language || !code) {
      return res.status(400).json({
        success: false,
        message: 'Language and code are required fields.'
      });
    }

    const compiler = compilerMap[language.toLowerCase()];
    
    if (!compiler) {
      return res.status(400).json({
        success: false,
        message: `Unsupported language: ${language}`
      });
    }

    // Call Wandbox API
    const response = await axios.post('https://wandbox.org/api/compile.json', {
      compiler: compiler,
      code: code,
      save: false
    });

    const data = response.data;
    
    res.status(200).json({
      success: true,
      compile: {
        output: data.compiler_message || data.compiler_error || ''
      },
      run: {
        stdout: data.program_message || data.program_output || '',
        stderr: data.program_error || ''
      },
      data: data
    });

  } catch (error) {
    console.error('Execution Error:', error.message || error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute code on server.',
      error: error.message,
      stack: error.stack
    });
  }
};
