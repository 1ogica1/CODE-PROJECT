var express = require('express');
var router = express.Router();
var converter = require('json-2-csv');
var http = require('http');
var fs = require('fs');
var request = require('request');
var Grouping = require('../models/grouping');
var Summary = require('../models/summary');
var retirement = require('../models/retirement');
var emp_projections = require('../models/emp_projections');
var endOfLine = require('os').EOL;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'DreamJob | Youth Employment'});
});

/* GET about page. */
router.get('/about', function(req, res, next) {
    res.render('about', {title: 'About DreamJob'});
});

/* GET contact page. */
router.get('/contact', function(req, res, next) {
    res.render('contact', {title: 'Contact DreamJob'});
});

router.get('/pullIDs', function(req, res, next) {
    request.get('http://www.edsc.gc.ca/ouvert-open/bca-seb/imt-lmi/NOC_occ_grouping_eng.csv', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var csv = body;

            var brokenCSV = csv.split(endOfLine);
            var subBroken;
            var subSubBroken;
            var subCategories;
            var testJSON = "[ ";

            for(var i = 0; i < brokenCSV.length; i++) {
                console.log(brokenCSV[i]);
                console.log(endOfLine);
                brokenCSV[i] = brokenCSV[i].replace(",\",\"", "\",\"");
                subBroken = brokenCSV[i].split(",\"");
                testJSON += "{ ";
                for(var j = 0; j < brokenCSV[i].length; j++)
                {
                    if(subBroken[j] == null || subBroken[j] == "undefined")
                    {
                        break;
                    }
                    else if(j == 0)
                    {
                        console.log("ID: " + subBroken[j]);
                        testJSON += "\"ID\" : \"" + subBroken[j] + "\",";
                    }
                    else if(j == 1)
                    {
                        subBroken[j] = subBroken[j].replace("\"", "");
                        console.log("Category Name: " + subBroken[j]);
                        testJSON += "\"CatName\" : \"" + subBroken[j] + "\",";
                    }
                    else
                    {
                        subBroken[j] = subBroken[j].replace("\"", "");
                        console.log("Subcategories: " + endOfLine);
                        testJSON += "\"Subcategories\" : [ ";
                        subSubBroken = subBroken[j].split(";");

                        for(var k = 0; k < subSubBroken.length; k++)
                        {
                            //console.log(subSubBroken.length);
                            //console.log(subSubBroken);

                            if(subSubBroken[k] != null && subSubBroken[k] != "undefined")
                            {
                                console.log("\t" + subSubBroken[k]);
                                subCategories = subSubBroken[k].split(/-(.+)?/);
                                console.log("\tID: " + subCategories[0].trim() + "\tName: " + subCategories[1].trim());
                                testJSON += "{\"ID\" : \"" + subCategories[0].trim() + "\", \"Name\" : \"" + subCategories[1].trim() + "\"},";
                            }
                            else
                            {
                                break;
                            }
                        }

                        testJSON = testJSON.substr(0,testJSON.length - 1);
                        testJSON += " ]";
                    }
                }
                console.log(endOfLine);
                testJSON += " },";
            }
            testJSON = testJSON.substr(0,testJSON.length - 1);
            testJSON += " ]";
            var finalJSON = JSON.parse(testJSON);

            for(var i = 0; i < finalJSON.length; i++)
            {
                if(typeof(finalJSON[i].ID) != "undefined")
                {
                    var group = new Grouping({
                        catID: finalJSON[i].ID,
                        catName: finalJSON[i].CatName
                    });

                    console.log(finalJSON[i].Subcategories);

                    if (finalJSON[i].Subcategories.length > 0) {
                        for (var j = 0; j < finalJSON[i].Subcategories.length; j++) {
                            group.subcategories.push(finalJSON[i].Subcategories[j]);
                        }
                    }

                    group.save();
                    console.log("Item " + i + " insterted.");
                    //console.log(finalJSON[i]);
                }
            }

            res.json(finalJSON);
        }
        else
        {
            res.json({
                "ERROR" : "ERROR! This shit didn't work, get fucked son!"
            });
        }
    });
});

router.get('/openSeeker', function(req, res, next) {
    request.get('http://www.edsc.gc.ca/ouvert-open/cesp-pcee/summary_sommaire.csv', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var temp = body;

            var brokenCSV = temp.split(endOfLine);
            var elements = brokenCSV[0].split(",");

            var csv = "nCode,emp2012,cumulativeEmployment,cumulativeRetirements,cumulativeOtherReplacement,cumulativeOpenings,cumulativeGrads,cumulativeImmigrants,cumulativeSeekersOther,cumulativeSeekersAll,assessmentEng,assessmentFr,finalAssessmentEng,finalAssessmentFr\n";

            //csv += endOfLine;

            csv += body;
            //console.log(csv);

            var options = {"DELIMITER" : {
                "FIELD" : ","
            }};

            var csv2jsonCallback = function (err, json) {
                if (err)
                {
                    res.json({
                        "error" : "ERROR, please don't contact us to see what's wrong!"
                    });
                };

                for(var i = 0; i < json.length; i++)
                {
                    if(typeof(json[i].nCode) != "undefined")
                    {
                        console.log(typeof json[i]);
                        console.log(json[i]);

                        var sum = new Summary({
                            ID: json[i].nCode,
                            emp_2012: json[i].emp2012,
                            emploi_growth: json[i].cumulativeEmployment,
                            retire: json[i].cumulativeRetirements,
                            replacement: json[i].cumulativeOtherReplacement,
                            j_openings: json[i].cumulativeOpenings,
                            school_leavers: json[i].cumulativeGrads,
                            immigrant_labor: json[i].cumulativeImmigrants,
                            j_seekers_other: json[i].cumulativeSeekersOther,
                            j_seekers_all: json[i].cumulativeSeekersAll,
                            labor_requirements_e: json[i].assessmentEng,
                            labor_requirements_f: json[i].assessmentFr,
                            final_assessment_e: json[i].finalAssessmentEng,
                            final_assessment_f: json[i].finalAssessmentFr
                        });

                        sum.save();
                        console.log("Document " + i + " inserted");
                    }
                }

                res.json(json);
                //console.log(typeof json);
                //console.log(json);
            }

            converter.csv2json(csv, csv2jsonCallback, options);
        }
    });
});

router.get('/dataPull', function(req, res, next) {
    request.get('http://www.edsc.gc.ca/ouvert-open/cesp-pcee/employment_emploi.csv', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var temp = body;

            var brokenCSV = temp.split(endOfLine);
            var elements = brokenCSV[0].split(",");

            var csv = "nCode";

            for(var i = 0; i < elements.length - 1; i++)
            {
                csv += ",p_" + (2013 + i);
            }

            csv += endOfLine;

            csv += body;
            //console.log(csv);






            var options = {"DELIMITER" : {
                "FIELD" : ","
            }};






            var csv2jsonCallback = function (err, json) {
                if (err)
                {
                    res.json({
                        "error" : "ERROR, please don't contact us to see what's wrong!"
                    });
                };

                for (var i = 0; i < json.length; i++) {
                    if (typeof(json[i].nCode) != "undefined") {
                        var group = new emp_projections({
                            ID: json[i].nCode,
                            p_2012: json[i].p_2012,
                            p_2013: json[i].p_2013,
                            p_2014: json[i].p_2014,
                            p_2015: json[i].p_2015,
                            p_2016: json[i].p_2016,
                            p_2017: json[i].p_2017,
                            p_2018: json[i].p_2018,
                            p_2019: json[i].p_2019,
                            p_2020: json[i].p_2020,
                            p_2021: json[i].p_2021,
                            p_2022: json[i].p_2022,
                            p_2023: json[i].p_2023
                        });

                        group.save();
                        console.log("Item " + i + " insterted.");
                        //console.log(finalJSON[i]);
                    }
                }

                res.json(json);
                //console.log(typeof json);
                //console.log(json);
                //console.log(counter);
            }

            converter.csv2json(csv, csv2jsonCallback, options);
        }
    });
});

router.get('/pullIDs', function(req, res, next) {
    request.get('http://www.edsc.gc.ca/ouvert-open/bca-seb/imt-lmi/NOC_occ_grouping_eng.csv', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var csv = body;

            var brokenCSV = csv.split(endOfLine);
            var subBroken;
            var subSubBroken;
            var subCategories;
            var testJSON = "[ ";

            for(var i = 0; i < brokenCSV.length; i++) {
                console.log(brokenCSV[i]);
                console.log(endOfLine);
                brokenCSV[i] = brokenCSV[i].replace(",\",\"", "\",\"");
                subBroken = brokenCSV[i].split(",\"");
                testJSON += "{ ";
                for(var j = 0; j < brokenCSV[i].length; j++)
                {
                    if(subBroken[j] == null || subBroken[j] == "undefined")
                    {
                        break;
                    }
                    else if(j == 0)
                    {
                        console.log("ID: " + subBroken[j]);
                        testJSON += "\"ID\" : \"" + subBroken[j] + "\",";
                    }
                    else if(j == 1)
                    {
                        subBroken[j] = subBroken[j].replace("\"", "");
                        console.log("Category Name: " + subBroken[j]);
                        testJSON += "\"CatName\" : \"" + subBroken[j] + "\",";
                    }
                    else
                    {
                        subBroken[j] = subBroken[j].replace("\"", "");
                        console.log("Subcategories: " + endOfLine);
                        testJSON += "\"Subcategories\" : [ ";
                        subSubBroken = subBroken[j].split(";");

                        for(var k = 0; k < subSubBroken.length; k++)
                        {
                            //console.log(subSubBroken.length);
                            //console.log(subSubBroken);

                            if(subSubBroken[k] != null && subSubBroken[k] != "undefined")
                            {
                                console.log("\t" + subSubBroken[k]);
                                subCategories = subSubBroken[k].split(/-(.+)?/);
                                console.log("\tID: " + subCategories[0].trim() + "\tName: " + subCategories[1].trim());
                                testJSON += "{\"ID\" : \"" + subCategories[0].trim() + "\", \"Name\" : \"" + subCategories[1].trim() + "\"},";
                            }
                            else
                            {
                                break;
                            }
                        }

                        testJSON = testJSON.substr(0,testJSON.length - 1);
                        testJSON += " ]";
                    }
                }
                console.log(endOfLine);
                testJSON += " },";
            }
            testJSON = testJSON.substr(0,testJSON.length - 1);
            testJSON += " ]";
            var finalJSON = JSON.parse(testJSON);

            for(var i = 0; i < finalJSON.length; i++)
            {
                if(typeof(finalJSON[i].ID) != "undefined")
                {
                    var group = new Grouping({
                        catID: finalJSON[i].ID,
                        catName: finalJSON[i].CatName
                    });

                    console.log(finalJSON[i].Subcategories);

                    if (finalJSON[i].Subcategories.length > 0) {
                        for (var j = 0; j < finalJSON[i].Subcategories.length; j++) {
                            group.subcategories.push(finalJSON[i].Subcategories[j]);
                        }
                    }

                    group.save();
                    console.log("Item " + i + " insterted.");
                    //console.log(finalJSON[i]);
                }
            }

            res.json(finalJSON);
        }
        else
        {
            res.json({
                "ERROR" : "ERROR! This shit didn't work, get fucked son!"
            });
        }
    });
});

module.exports = router;
