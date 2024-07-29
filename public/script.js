const POST_URL_AskAi = 'http://localhost:3000/AskAi';
const POST_URL_INSERT_EXECUTION = 'http://localhost:3000/insertExecuation';
GroupData=[];
CheckedQuestions=[];
RESULT=[];
$(document).ready(function() {
    // Normalize the data
    const groupedQuestions = Q.reduce((acc, item) => {
        const existingQuestion = acc.find(q => q.QuestionId === item[0]);
        if (existingQuestion) {
            const existingAnswer = existingQuestion.Answers.find(a => a.AnswerId === item[9]);
            if (!existingAnswer) {
                existingQuestion.Answers.push({
                    AnswerId: item[9],
                    AnswerScore: item[10],
                    AnswerBody: item[11],
                    AnswerCreationDate: item[12]
                });
            }
        } else {
            acc.push({
                QuestionId: item[0],
                Title: item[1],
                QuestionCreationDate: item[2],
                QuestionScore: item[3],
                ViewCount: item[4],
                AnswerCount: item[5],
                FavoriteCount: item[6],
                QuestionBody: item[7],
                Tags: item[8],
                Answers: [{
                    AnswerId: item[9],
                    AnswerScore: item[10],
                    AnswerBody: item[11],
                    AnswerCreationDate: item[12]
                }]
            });
        }
        return acc;
    }, []);

    // Shuffle answers for each question
    groupedQuestions.forEach(question => {
        question.Answers = shuffleArray(question.Answers);
    });

    GroupData=groupedQuestions;
    // Function to parse tags string into an array
    function parseTags(tagsString) {
        return tagsString.slice(1, -1).split('><');
    }

    // Initialize DataTable
    const table = $('#question-table').DataTable({
        data: groupedQuestions,
        columns: [
            {
                data: null,
                orderable: false,
                className: 'checkbox-column',
                render: function (data, type, row) {
                    return '<input type="checkbox" class="row-checkbox">';
                }
            },
            { data: 'QuestionId' },
            { data: 'Title' },
            { 
                data: 'QuestionCreationDate',
                render: function(data) {
                    return new Date(data).toLocaleDateString();
                }
            },
            { data: 'QuestionScore' },
            { data: 'ViewCount' },
            { data: 'AnswerCount' },
            { 
                data: 'Tags',
                render: function(data) {
                    const tags = parseTags(data);
                    return tags.map(tag => `<span class="tag">${tag}</span>`).join(' ');
                }
            }
        ],
        order: [[1, 'asc']],
        createdRow: function(row, data, dataIndex) {
            $(row).attr('id', `question-${data.QuestionId}`);
        }
    });

    // Handle "Select All" checkbox
    $('#select-all-checkbox').on('change', function() {
        const isChecked = this.checked;
        $('.row-checkbox').prop('checked', isChecked);
    });

    // Update "Select All" checkbox state when individual checkboxes change
    $('#question-table').on('change', '.row-checkbox', function() {
        const allChecked = $('.row-checkbox:checked').length === $('.row-checkbox').length;
        $('#select-all-checkbox').prop('checked', allChecked);
    });

    // Handle "Send Selected Questions" button
    $('.send-button').on('click', function() {
        const selectedRows = table.rows().nodes().filter(function(tr) {
            return $(tr).find('.row-checkbox').prop('checked');
        });
        const selectedData = selectedRows.map(function(tr) {
            return table.row(tr).data();
        }).toArray();

        const selectedModel = $('#model-select').val();

        if (selectedModel && selectedData.length > 0) {
            console.log('Selected Model:', selectedModel);
            console.log('Selected Questions:', selectedData);
            // Here you would typically send this data to your backend
            //alert(`Sending ${selectedData.length} questions to ${selectedModel}`);
            //console.log(generateLLMPrompt(selectedData[i],selectedModel));
            
            // here we need to make a timeout to send request of each question to ai api by the model name.
            for (let i = 0; i < selectedData.length; i++) {
                setTimeout(() => {
                    const prompt = generateLLMPrompt(selectedData[i],selectedModel);
                    AiAPICall(prompt);
                }, 5000 * i);
            }


        } else {
            alert('Please select a model and at least one question.');
        }
    });

    // Add event listener for row clicks to show question details
    $('#question-table tbody').on('click', 'tr', function(e) {
        // Prevent opening details when clicking on the checkbox
        if ($(e.target).hasClass('row-checkbox')) {
            return;
        }
        const data = table.row(this).data();
        showQuestionDetails(data);
    });

    // Function to show question details
    function showQuestionDetails(question) {
        const tags = parseTags(question.Tags);
        const detailsHTML = `
            <div class="question-details">
                <h2>${question.Title}</h2>
                <p><strong>Question Score:</strong> ${question.QuestionScore}</p>
                <p><strong>View Count:</strong> ${question.ViewCount}</p>
                <p><strong>Answer Count:</strong> ${question.AnswerCount}</p>
                <p><strong>Favorite Count:</strong> ${question.FavoriteCount}</p>
                <h3>Question Body:</h3>
                <div class="question-body">${formatContent(question.QuestionBody)}</div>
                <h3>Tags:</h3>
                <p>${tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}</p>
                <h3>Answers:</h3>
                ${question.Answers.map(answer => `
                    <div class="answer">
                        <div class="answer-header">
                            <span class="answer-score">Score: ${answer.AnswerScore}</span>
                            <span class="answer-date">Answered on: ${new Date(answer.AnswerCreationDate).toLocaleString()}</span>
                        </div>
                        <div class="answer-body">${formatContent(answer.AnswerBody)}</div>
                    </div>
                `).join('')}
            </div>
        `;

        // Create a modal to display question details
        $('<div>')
            .html(detailsHTML)
            .dialog({
                title: 'Question Details',
                width: Math.min($(window).width() * 0.8, 800),
                height: Math.min($(window).height() * 0.8, 600),
                modal: true,
                create: function() {
                    $(this).css("maxWidth", "100%");
                },
                open: function() {
                    $('.ui-widget-overlay').on('click', function() {
                        $(this).siblings('.ui-dialog').find('.ui-dialog-content').dialog('close');
                    });
                }
            });
    }
       // Function to format content, handling images and code blocks
    function formatContent(content) {
        // Replace image tags with responsive ones
        content = content.replace(/<img[^>]+>/g, function(imgTag) {
            return imgTag.replace(/width="[^"]*"/g, 'width="100%"')
                         .replace(/height="[^"]*"/g, 'height="auto"');
        });

        // Wrap code blocks with pre tags if not already wrapped
        content = content.replace(/<code>([\s\S]*?)<\/code>/g, function(match, codeContent) {
            if (match.indexOf('<pre>') === -1) {
                return '<pre><code>' + codeContent + '</code></pre>';
            }
            return match;
        });

        return content;
    }
});




// Shuffle function
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}




function AiAPICall(prompt) {
    const request =
    {
        text: prompt.text,
        model:prompt.modelName
    };
    $.ajax({
        url: POST_URL_AskAi,
        method: 'POST',
        data: JSON.stringify(request),
        contentType: 'application/json',
        success: function(response) {
            console.log('AJAX call successful:', response);
            // Handle the response here
            successCallbackLLMcall(response);
        },
        error: function(error) {
            console.error('AJAX call failed:', error);
            // Handle the error here
        }
    });
}


//return a propmt object.
function generateLLMPrompt(questionObject,modelName) {
    const questionBody = questionObject.QuestionBody.replace(/<[^>]*>/g, '').trim();
    const answers = questionObject.Answers.map((answer, index) => ({
        id: answer.AnswerId,
        body: answer.AnswerBody.replace(/<[^>]*>/g, '').trim()
    }));

    const promptText = `You are an AI assistant helping me rank answers to questions asked on StackOverflow.

Here is the question:
Question ID: ${questionObject.QuestionId}
Question body:
${questionBody}

Here are the answers given to this question:

${answers.map((answer, index) => `Answer ID: ${answer.id}\nAnswer ${index + 1}:\n${answer.body}`).join('\n\n')}

Rank these answers from best to worst and add a rating from 1-10 for each one. Return your response in JSON format only, like this:
[
    {
        "answer_index": 1-${answers.length},
        "answer_id": "the id of the answer",
        "question_id": "${questionObject.QuestionId}",
        "rating": 1-10,
        "reason": "something"
    },
    // ... more answers ...
]`;

    const prompt = {
        text: normalizeSpaces(promptText),
        questionId: questionObject.QuestionId,
        answersIds: answers.map(answer => answer.id),
        tokens: normalizeSpaces(promptText).split(/\s+/).length,
        modelName: modelName
    };

    return prompt;
}

// Assuming this function exists elsewhere in your code
function normalizeSpaces(text) {
    return text.replace(/\s+/g, ' ').trim();
}


function successCallbackLLMcall(response) {

    //console.log(response.result);
    try {

        const resString = cleanJsonString(response.result);
        console.log(resString);
        const res = JSON.parse(resString);
        console.log('Parsed JSON response:', res);

        // Example of the object we need to send to the server to save in the sql:
        // const questionObject = {
        //     batchID: 1,
        //     QuestionID: 100,
        //     AnswerID: 200,
        //     AnswerIndex: 1,
        //     HumanRank: 5,
        //     AiRank: 4,
        //     AiExplnation: 'This is an AI explanation'
        // };

        const execuationObj = transformData(res);
        console.log('after transform before the ajax call',execuationObj);
        


        // here the api post call with ajax  for saving to sql.
        $.ajax({
            url: POST_URL_INSERT_EXECUTION,
            method: 'POST',
            data: JSON.stringify(execuationObj),
            contentType: 'application/json',
            success: function(response) {
                console.log('AJAX call successful:', response);
                // Handle the response here
                //handle the ui of the client side.
                compareRanks(execuationObj);

            },
            error: function(error) {
                console.error('AJAX call failed:', error);
                // Handle the error here
            }
        });

    } catch (error) {
        console.error('Error parsing JSON response:', error);
    }
}


// Function to clean the string
function cleanJsonString(str) {
    // Remove any potential hidden characters at the start of the string
    str = str.replace(/^\uFEFF/, '');
    // Remove any potential formatting characters
    str = str.replace(/^```json\s*/, '').replace(/```$/, '');
    str = str.replace("```", "");
    // Trim whitespace
    return str.trim();
}



function normalizeSpaces(str) {
    // Step 1: Trim leading and trailing spaces
    str = str.trim();
    
    // Step 2: Replace multiple spaces with a single space
    str = str.replace(/\s+/g, ' ');
    
    // Step 3: Ensure space after punctuation if followed by a word character
    str = str.replace(/([.,!?:;])\s*(\w)/g, '$1 $2');
    
    // Step 4: Remove space before punctuation
    str = str.replace(/\s+([.,!?:;])/g, '$1');
    
    return str;
}

function transformData(data) {
    return data.map(res => ({
        batchID: res.question_id,
        QuestionID: res.question_id,
        AnswerID: res.answer_id,
        AnswerIndex: res.answer_index,
        HumanRank: GroupData.find(q => q.QuestionId == res.question_id).Answers.find(a => a.AnswerId == res.answer_id).AnswerScore,
        AiRank: res.rating,
        AiExplnation: res.reason,
        modelName: $('#model-select').val()
    }));
}
const demi =[
    {
        "batchID": "8245093",
        "QuestionID": "8245093",
        "AnswerID": "8245207",
        "AnswerIndex": 1,
        "HumanRank": 15,
        "AiRank": 9,
        "AiExplnation": "This answer provides a clear and concise solution to the JSLint issue. It directly addresses the 'in' operator concern and offers a widely compatible alternative that works across browsers.",
        "modelName": "gemini-1.5"
    },
    {
        "batchID": "8245093",
        "QuestionID": "8245093",
        "AnswerID": "8245176",
        "AnswerIndex": 3,
        "HumanRank": 3,
        "AiRank": 25,
        "AiExplnation": "This answer provides a solution that technically addresses the JSLint complaint but is more complex and less readable compared to the other options. The use of `hasOwnProperty` in this context is not the most appropriate way to test for property existence.",
        "modelName": "gemini-1.5"
    },
    {
        "batchID": "8245093",
        "QuestionID": "8245093",
        "AnswerID": "8245180",
        "AnswerIndex": 2,
        "HumanRank": 5,
        "AiRank": 53,
        "AiExplnation": "This answer advises against making JSLint happy, recommending JSHint instead. While JSHint offers more flexibility, it doesn't directly solve the problem and focuses on a broader point about coding standards. It fails to provide a workable solution for the specific issue of JSLint's 'in' operator concern.",
        "modelName": "gemini-1.5"
    }
]

function compareRanks(data) {


   const answers =  GroupData.find(q => q.QuestionId == data[0].QuestionID).Answers
   const sortedAnswersofHumans = answers.sort((a, b) => b.AnswerScore - a.AnswerScore);
    const sortedAnswersofAI = data.sort((a, b) => b.AiRank - a.AiRank);

    console.log(sortedAnswersofAI);
    console.log(sortedAnswersofHumans);

    const differences = calculateIndexDifferences(sortedAnswersofHumans, sortedAnswersofAI);

    differences.sum = Object.values(differences).reduce((acc, val) => acc + val, 0);
    console.log(differences);
    const questionChecked=GroupData.find(q => q.QuestionId == data[0].QuestionID).differences = differences;
    const tr = $(`#question-${data[0].QuestionID}`);


   
    tr.css('background-color', getColor(differences.sum,4));


    CheckedQuestions.push(questionChecked);


}

function getColor(value,maxVal) {
    const normalizedValue = Math.min(value / maxVal, 1);
    const red = Math.round(255 * normalizedValue);
    const green = Math.round(255 * (1 - normalizedValue));
    return `rgb(${red}, ${green}, 0)`;
}

function calculateIndexDifferences(arrayHumans, arrayAI) {
    // Create objects to store the index of each AnswerId/AnswerID in both arrays
    const indexDict1 = Object.fromEntries(
        arrayHumans.map((item, index) => [item.AnswerId, index])
    );
    const indexDict2 = Object.fromEntries(
        arrayAI.map((item, index) => [item.AnswerID, index])
    );

    const differences = {};

    // Calculate the difference for each AnswerId
    for (const answerId in indexDict1) {
        if (answerId in indexDict2) {
            const difference = indexDict1[answerId] - indexDict2[answerId];
            differences[answerId] = difference!=0?Math.abs(difference):0;
        }
    }

    return differences;
}










// [
//     {
//       "answer_index": 1,
//       "rating": 8,
//       "reason": "This answer provides a valid alternative to the 'in' operator, addressing JSLint's concern while still being concise and effective for the specific placeholder support check."
//     },
//     {
//       "answer_index": 3,
//       "rating": 5,
//       "reason": "This answer suggests using `hasOwnProperty.call` to check for the placeholder property. While technically correct, it's unnecessarily complex for the simple task of checking for the existence of a property. It might lead to confusion and doesn't offer any significant advantages over the simpler alternatives."
//     },
//     {
//       "answer_index": 2,
//       "rating": 2,
//       "reason": "This answer encourages ignoring JSLint's suggestions and using JSHint instead. While JSHint is more configurable and flexible, it doesn't address the specific issue of the 'in' operator. This answer focuses on the tool preference rather than providing a solution to the original problem."
//     }
// ]