(function() {

    function failure(x) {
        console.log(x);
        alert(x);
    }

    function elem(id) {
        var e = document.getElementById(id);
        if (!e) {
            failure("Could not find element of id: " + id);
        }
        return e;
    }

    function nextRandom(min, range) {
        return Math.floor(Math.random() * range) + min;
    }

    var app = elem("app");
    var result = elem("result");
    var result_output = elem("result-output");
    var names = elem("names");
    var v_names = elem("v-names");
    var tables = elem("tables");
    var v_tables = elem("v-tables");
    var participants = elem("participants");
    var v_participants = elem("v-participants");
    var v_seating = elem("v-seating");
    var e_seechart = elem("e_seechart");
    var seechart = elem("seechart");
    var back = elem("back");
    var download = elem("download");

    var waiting = false;
    var parameters = {};

    function removeEmpty(l) {
        for (var i = 0; i < l.length; ) {
            if (!l[i]) {
                l.splice(i, 1);
            } else {
                l[i] = l[i].trim();
                ++i;
            }
        }
        return l;
    }

    function validate() {
        var error = false;
        waiting = false;
        var ntt = tables.value;
        var npt = participants.value;
        var nn = names.value;
        var nl = removeEmpty(nn.split('\n'));
        if (nn !== "" && nl.length < 2) {
            v_names.innerText = "The list needs at least two names.";
        } else {
            v_names.innerText = "";
            parameters.names = nl;
        }
        if (nl.length > 1 && ntt === "" && npt === "") {
            ntt = Math.floor(nl.length/2).toString();
            tables.value = ntt;
            npt = "2";
            participants.value = npt;
        }
        var nt = parseInt(ntt, 10);
        if (ntt !== "" && (isNaN(nt) || nt < 1)) {
            v_tables.innerText = "At least one table is needed.";
            error = true;
        } else {
            v_tables.innerText = "";
            parameters.numTables = nt;
        }
        var np = parseInt(npt, 10);
        if (npt !== "" && (isNaN(np) || np < 2)) {
            v_participants.innerText = "Each table needs at least 2 seats.";
            error = true;
        } else {
            v_participants.innerText = "";
            parameters.numSeats = np;
        }
        if (!error && (nl.length > 1 && np > 0 && nt > 0)) {
            e_seechart.innerText = nl.length + " participants at " + nt + " tables with " + np + " seats each.";
            seechart.disabled = false;
        } else {
            e_seechart.innerText = "";
            seechart.disabled = true;
        }
        parameters.errors = [];
    }

    function startValidationTimeout() {
        if (!waiting) {
            waiting = true;
            setTimeout(validate, 1);
        }
    }

    //  todo: three tables of four, nine people, should probably not fill each table
    //  todo: allow people to re-match rather than sit out

    function badresult(parameters, result) {
        alert(result);
        parameters.errors.push(result);
    }

    function arrayRemove(a, e) {
        for (var i = 0, n = a.length; i != n; ++i) {
            if (a[i] === e) {
                a.splice(i, 1);
                return a;
            }
        }
        return a;
    }

    function arrayClone(a) {
        return a.slice(0);
    }
    
    function isComplete(peopleToMeet) {
        for (var k in peopleToMeet) {
            if (peopleToMeet[k].length > 0) {
                return false;
            }
        }
        return true;
    }

    function loneliestPerson(peopleToMeet, metThisRound) {
        var nlen = 0;
        var loneliest = undefined;
        for (var k in peopleToMeet) {
            if (!metThisRound[k]) {
                if ((peopleToMeet[k].length > 0) && (peopleToMeet[k].length + nextRandom(0, 10) > nlen)) {
                    loneliest = k;
                    nlen = peopleToMeet[k].length;
                }
            }
        }
        return loneliest;
    }

    function fillSeat(list, metThisRound) {
        for (var i = 0, n = list.length; i != n; ++i) {
            if (!metThisRound[list[i]]) {
                return list[i];
            }
        }
        return undefined;
    }

    function fillTable(thisTable, numSeats, peopleToMeet, metThisRound) {
        var p = loneliestPerson(peopleToMeet, metThisRound);
        if (!p) {
            return 0;
        }
        var list = peopleToMeet[p];
        var seatsUsed = 0;
        while (seatsUsed < numSeats) {
            var q = fillSeat(list, metThisRound);
            if (!q) {
                return seatsUsed;
            }
            if (p) {
                metThisRound[p] = true;
                thisTable.push(p);
                p = undefined;
                seatsUsed += 1;
            }
            metThisRound[q] = true;
            thisTable.push(q);
            seatsUsed += 1;
        }
        return seatsUsed;
    }

    function markPeopleMet(table, round, peopleToMeet, peopleMet) {
        for (var i = 0, n = table.length; i != n; ++i) {
            var a = table[i];
            for (var j = i+1, m = table.length; j != m; ++j) {
                var b = table[j];
                peopleMet[a][round] = b;
                peopleMet[b][round] = a;
                peopleToMeet[a] = arrayRemove(peopleToMeet[a], b);
                peopleToMeet[b] = arrayRemove(peopleToMeet[b], a);
            }
        }
    }

    function canMergeTable(table, seen) {
        for (var i = 0, n = table.length; i != n; ++i) {
            if (seen[table[i]]) {
                return false;
            }
        }
        return true;
    }

    function markSeen(table, seen) {
        for (var i = 0, n = table.length; i != n; ++i) {
            seen[table[i]] = true;
        }
    }

    function mergeTables(rounds, numTables) {
        for (var i = 0, n = rounds.length; i != n; ++i) {
            if (rounds[i].length < numTables) {
                //  have a table free
                var seen = {};
                for (var j = 0, m = rounds[i].length; j != m; ++j) {
                    markSeen(rounds[i][j], seen);
                }
                for (var r = i+1; r != n; ++r) {
                    for (var t = rounds[r].length-1; t >= 0; --t) {
                        var table = rounds[r][t];
                        if (canMergeTable(table, seen)) {
                            going = true;
                            rounds[r].splice(t, 1);
                            markSeen(table, seen);
                            rounds[i].push(table);
                        }
                        if (rounds[i].length == numTables) {
                            break;
                        }
                    }
                    if (rounds[i].length == numTables) {
                        break;
                    }
                }
            }
        }
        for (var i = rounds.length-1; i >= 0; --i) {
            if (rounds[i].length == 0) {
                rounds.splice(i, 1);
            }
        }
    }

    function calculateSeatingOnce(parameters) {
        var peopleMet = {};
        var peopleToMeet = {};
        var peoples = [];
        var rounds = [];
        for (var i = 0, n = parameters.names.length; i != n; ++i) {
            var name = parameters.names[i];
            if (peoples[name]) {
                badresult(parameters, "The name " + name + " occurs more than once!");
            } else {
                peopleMet[name] = [];
                peoples.push(name);
            }
        }
        for (var i = 0, n = peoples.length; i != n; ++i) {
            var name = peoples[i];
            peopleToMeet[name] = arrayRemove(arrayClone(peoples), name);
        }
        var roundId = 0;
        while (true) {
            if (isComplete(peopleToMeet)) {
                break;
            }
            var thisRound = [];
            var metThisRound = {};
            for (var t = 0; t != parameters.numTables; ++t) {
                var thisTable = [];
                fillTable(thisTable, parameters.numSeats, peopleToMeet, metThisRound);
                if (thisTable.length == 0) {
                    break;
                }
                markPeopleMet(thisTable, roundId, peopleToMeet, peopleMet);
                thisRound.push(thisTable);
            }
            if (thisRound.length == 0) {
                badresult(parameters, "Calculation error: cannot find a suitable solution.")
                break;
            }
            rounds.push(thisRound);
        }
        mergeTables(rounds, parameters.numTables);
        return rounds;
    }

    function calculateSeating(parameters) {
        var numRounds = undefined;
        var solution = undefined;
        var solErrors = undefined;
        //  try ten times, get the best solution
        var now = Date.now();
        for (var i = 0; i != 20 * (parameters.names.length * parameters.names.length + 1); ++i) {
            var rounds = calculateSeatingOnce(parameters);
            if ((numRounds === undefined) || (numRounds > rounds.length) || (solErrors.length && !parameters.errors.length)) {
                numRounds = rounds.length;
                solution = rounds;
                solErrors = parameters.errors;
            }
            parameters.errors = [];
            if ((Date.now() - now > 3000) && (i > 30)) {
                console.log("Tested " + i + " solutions");
                break;
            }
        }
        parameters.errors = solErrors;
        return solution;
    }

    function htmlquote(s) {
        return s.replace(/&/, '&amp;').replace(/</, '&lt;').replace(/>/, '&gt;');
    }

    function renderSeating(seating, element, errors) {
        var l = [];
        for (var i = 0, n = errors.length; i != n; ++i) {
            l.push("<div class='error'>");
            l.push(htmlquote(errors[i]));
            l.push("</div>");
        }
        var numrounds = seating.length;
        personSeatsByRound = {};
        for (var round = 0; round != seating.length; ++round) {
            l.push("<div class='round'><div class='label'>Round " + (round + 1).toString() + "</div><div class='content'>");
            for (var table = 0; table != seating[round].length; ++table) {
                l.push("<div class='table'><div class='label'>Table " + (table + 1).toString() + "</div><div class='content'>");
                for (var participant = 0; participant != seating[round][table].length; ++participant) {
                    var name = seating[round][table][participant];
                    l.push("<div class='participant'>" + htmlquote(name) + "</div>");
                    if (!personSeatsByRound[name]) {
                        personSeatsByRound[name] = {};
                    }
                    personSeatsByRound[name][round] = table;
                }
                l.push("</div></div>");
            }
            l.push("</div></div>");
        }
        var persons = Object.keys(personSeatsByRound).sort();
        for (var i = 0; i != persons.length; ++i) {
            l.push("<div class='person'><div class='label'>" + htmlquote(persons[i]) + "</div><div class='content'>");
            var seats = personSeatsByRound[persons[i]];
            for (var j = 0; j != numrounds; ++j) {
                var sname = 'n/a';
                if ((seats[j] === 0) || seats[j]) {
                    sname = 'Table ' + (seats[j] + 1).toString();
                }
                l.push("<div class='assignment'><div class='label'>Round " + (j + 1).toString() + "</div><div class='seat'>" + sname + "</div></div>");
            }
            l.push("</div></div>");
        }

        element.innerHTML = l.join("");
    }

    function writeCsvFile(csv, filename) {
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        if (navigator.msSaveBlob) { // IE 10+
            navigator.msSaveBlob(blob, filename);
        } else {
            var link = document.createElement("a");
            if (link.download !== undefined) { // feature detection
                // Browsers that support HTML5 download attribute
                var url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert("Your browser seems to be blocking downloaded files, so this won't work.");
            }
        }
    }

    function exportAsCsv(seating) {
        var exp = [];
        var hdr = ['Name'];
        for (var round = 0; round != seating.length; ++round) {
            hdr.push("Round " + (round + 1).toString());
            for (var table = 0; table != seating[round].length; ++table) {
                for (var participant = 0; participant != seating[round][table].length; ++participant) {
                    var name = seating[round][table][participant];
                    if (!personSeatsByRound[name]) {
                        personSeatsByRound[name] = {};
                    }
                    personSeatsByRound[name][round] = table;
                }
            }
        }
        exp.push(hdr.join(','));
        var persons = Object.keys(personSeatsByRound).sort();
        for (var i = 0; i != persons.length; ++i) {
            var per = [];
            per.push('"' + persons[i] + '"');
            var seats = personSeatsByRound[persons[i]];
            for (var j = 0; j != seating.length; ++j) {
                var sname = 'n/a';
                if ((seats[j] === 0) || seats[j]) {
                    sname = 'Table ' + (seats[j] + 1).toString();
                }
                per.push(sname);
            }
            exp.push(per.join(','));
        }
        var csv = exp.join('\n');

        writeCsvFile(csv, "Seating Chart for " + persons.length.toString() + ".csv");
    }

    names.onchange = startValidationTimeout;
    names.onblur = startValidationTimeout;
    names.setAttribute('placeholder', "Names\nGo\nHere")

    tables.onchange = startValidationTimeout;
    tables.onblur = startValidationTimeout;

    participants.onchange = startValidationTimeout;
    participants.onblur = startValidationTimeout;

    //  TODO:
    //  When not edited the tables but change capacity, re-calculate table count

    seechart.onclick = function () {
        app.remove();
        var seating = calculateSeating(parameters);
        parameters.seating = seating;
        renderSeating(seating, result_output, parameters.errors);
        document.body.appendChild(result);
    }

    back.onclick = function () {
        result.remove();
        document.body.appendChild(app);
    }

    download.onclick = function () {
        exportAsCsv(parameters.seating);
    }

    seechart.disabled = true;

    result.remove();
    names.focus();

    startValidationTimeout();

})();