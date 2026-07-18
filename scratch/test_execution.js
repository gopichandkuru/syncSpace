const axios = require('axios');

const TEMPLATES = {
  cpp: '#include<bits/stdc++.h>\nusing namespace std;\n\nint main(){\n  cout << "Hello C++ World";\n  return 0;\n}\n',
  c: '#include <stdio.h>\n\nint main() {\n  printf("Hello C World\\n");\n  return 0;\n}\n',
  csharp: 'using System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hello C# World");\n  }\n}\n',
  php: '<?php\n\necho "Hello PHP World\\n";\n',
  rust: 'fn main() {\n    println!("Hello Rust World");\n}\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello Go World")\n}\n',
  python: 'print("Hello Python World")\n',
  java: 'class Main{\n  public static void main(String args[]){\n    System.out.println("Hello Java World");\n  }\n}\n',
  typescript: 'console.log("Hello TypeScript World");\n'
};

async function testAll() {
  console.log('--- STARTING EXECUTION TESTS ---');
  for (const [lang, code] of Object.entries(TEMPLATES)) {
    try {
      const res = await axios.post('http://localhost:5005/api/v1/execute', {
        language: lang,
        code
      });
      console.log(`✅ [${lang.toUpperCase()}] executed successfully!`);
      console.log(`   Output: ${res.data.run.stdout.trim()}`);
    } catch (err) {
      console.log(`❌ [${lang.toUpperCase()}] failed!`);
      console.log(`   Error:`, err.response?.data || err.message);
    }
  }
}

testAll();
