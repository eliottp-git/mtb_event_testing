const fs = require('fs');
const _ = require('lodash');

class ParameterValidator {
  constructor(dataFile, conditionsFile) {
    this.data = this.loadJSON(dataFile);
    this.conditions = this.loadConditions(conditionsFile);
  }

  loadJSON(filename) {
    try {
      const fileContent = fs.readFileSync(filename, 'utf8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error(`Error loading ${filename}:`, error.message);
      return null;
    }
  }

  loadConditions(filename) {
    try {
      const fileContent = fs.readFileSync(filename, 'utf8');
      // Extract variables that start with $ from the conditions file
      const variableMatches = fileContent.match(/\$(\w+)/g);
      return variableMatches ? variableMatches.map(v => v.substring(1)) : [];
    } catch (error) {
      console.error(`Error loading ${filename}:`, error.message);
      return [];
    }
  }

  // Get all properties from nested objects (including arrays)
  getAllProperties(obj, prefix = '') {
    let properties = [];
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        properties = properties.concat(this.getAllProperties(item, `${prefix}[${index}]`));
      });
    } else if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        properties.push(fullKey);
        properties = properties.concat(this.getAllProperties(obj[key], fullKey));
      });
    }
    
    return properties;
  }

  // Check if a parameter exists in the data
  checkParameterExists(parameterName, data) {
    const allProperties = this.getAllProperties(data);
    
    // Check for exact match
    const exactMatch = allProperties.some(prop => prop.endsWith(`.${parameterName}`) || prop === parameterName);
    
    // Check for similar matches (case-insensitive, partial matches)
    const similarMatches = allProperties.filter(prop => {
      const lastPart = prop.split('.').pop();
      return lastPart.toLowerCase().includes(parameterName.toLowerCase()) || 
             parameterName.toLowerCase().includes(lastPart.toLowerCase());
    });

    return {
      exists: exactMatch,
      exactMatch: exactMatch,
      similarMatches: similarMatches,
      allProperties: allProperties
    };
  }

  validateAllParameters() {
    if (!this.data || !this.conditions.length) {
      console.error('Failed to load data or conditions');
      return;
    }

    console.log('�� Validating parameters against data...\n');
    console.log('Required parameters from conditions file:');
    this.conditions.forEach((param, index) => {
      console.log(`  ${index + 1}. ${param}`);
    });
    console.log('\n' + '='.repeat(60) + '\n');

    const results = [];
    let foundCount = 0;
    let missingCount = 0;

    this.conditions.forEach((parameter, index) => {
      console.log(`Checking parameter ${index + 1}: ${parameter}`);
      
      const checkResult = this.checkParameterExists(parameter, this.data);
      
      if (checkResult.exactMatch) {
        console.log(`✅ FOUND: ${parameter} exists in data`);
        foundCount++;
      } else {
        console.log(`❌ MISSING: ${parameter} not found in data`);
        missingCount++;
        
        if (checkResult.similarMatches.length > 0) {
          console.log(`   💡 Similar properties found:`);
          checkResult.similarMatches.forEach(match => {
            console.log(`      - ${match}`);
          });
        }
      }
      
      results.push({
        parameter,
        found: checkResult.exactMatch,
        similarMatches: checkResult.similarMatches
      });
      
      console.log('-'.repeat(40) + '\n');
    });

    // Summary
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(30));
    console.log(`✅ Found: ${foundCount}/${this.conditions.length} parameters`);
    console.log(`❌ Missing: ${missingCount}/${this.conditions.length} parameters`);
    console.log(`📈 Success Rate: ${Math.round((foundCount / this.conditions.length) * 100)}%`);

    // Show missing parameters
    if (missingCount > 0) {
      console.log('\n🚨 MISSING PARAMETERS:');
      results.filter(r => !r.found).forEach(r => {
        console.log(`   - ${r.parameter}`);
      });
    }

    return results;
  }

  // Method to show all available properties in the data
  showAllDataProperties() {
    if (!this.data) {
      console.error('No data loaded');
      return;
    }

    console.log('�� ALL PROPERTIES IN DATA:');
    console.log('='.repeat(40));
    const allProps = this.getAllProperties(this.data);
    allProps.forEach(prop => console.log(`   - ${prop}`));
  }

  // Method to find specific parameter in data
  findParameter(parameterName) {
    if (!this.data) {
      console.error('No data loaded');
      return;
    }

    const allProps = this.getAllProperties(this.data);
    const matches = allProps.filter(prop => 
      prop.toLowerCase().includes(parameterName.toLowerCase())
    );

    console.log(`�� Searching for: ${parameterName}`);
    if (matches.length > 0) {
      console.log('Found matches:');
      matches.forEach(match => console.log(`   - ${match}`));
    } else {
      console.log('No matches found');
    }

    return matches;
  }
}

// Usage example
function main() {
  const validator = new ParameterValidator('data.json', 'conditions.js');
  
  // Validate all parameters
  const results = validator.validateAllParameters();
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Show all available properties (optional)
  console.log('Would you like to see all available properties? (uncomment the line below)');
  // validator.showAllDataProperties();
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = ParameterValidator;