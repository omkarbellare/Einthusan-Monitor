var languages = new Array();
var fetchedTitles = new Array();
var done = 4, ok = 200;
var homeUrl = "http://www.einthusan.com/";
var queryPath = "index.php?lang=";
var newMoviesCnt;
var langsChecked;

var LANGUAGE_REQUEST_CONST = "languageRequest";
var MOVIES_REQUEST_CONST = "moviesRequest";

var INTERVAL_CONST = 1*60*60*1000; //One hour

{
	initiate();
}

function initiate()
{
	sendXMLRequest(homeUrl, LANGUAGE_REQUEST_CONST, null);
	setTimeout(initiate, INTERVAL_CONST);
}

function getMovieTitlesForLanguage(languageName)
{
	sendXMLRequest(homeUrl+queryPath+languageName.toLowerCase(), MOVIES_REQUEST_CONST, languageName);
}

function capitaliseFirstLetter(string)
{
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function sendXMLRequest(url, requestType, languageName, responseHandler)
{
	var request = new XMLHttpRequest();
	request.open("GET", url, true);
	request.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	request.onreadystatechange = getResponseHandler(request, requestType, languageName, handleXMLRequestResponse);
	request.send();
}

function handleXMLRequestResponse(requestType, languageName, responseText)
{
	if(requestType == LANGUAGE_REQUEST_CONST)
	{
		var doc = document.implementation.createHTMLDocument("languages");
		doc.documentElement.innerHTML = responseText;
		var langs = doc.getElementsByTagName('li');
		for(i=0; i<langs.length; i++)
		{
			langName = langs[i].firstChild.innerHTML;
			languages.push(langName);
		}
		fetchedTitles.length = languages.length;
		newMoviesCnt = new Array(); newMoviesCnt.length = languages.length;
		langsChecked = new Array(); langsChecked.length = languages.length;

		for(i=0; i<languages.length; i++)
		{
			langsChecked[i] = 0;
			newMoviesCnt[i] = 0;
			getMovieTitlesForLanguage(languages[i]);
		}
		setTimeout(fireNotification, 1000);
	}
	else if(requestType == MOVIES_REQUEST_CONST)
	{	
		var movieObjArray = new Array();
		var languageIndex = languages.indexOf(capitaliseFirstLetter(languageName));
		var doc = document.implementation.createHTMLDocument("movies");
		doc.documentElement.innerHTML = responseText;
		var movieElems = doc.getElementsByClassName("movie-title");
		var movieCovers = doc.getElementsByClassName("movie-cover-wrapper");
		for(i=0; i<movieElems.length; i++)
		{
			movieObjArray.push(new MovieObject(movieElems[i].innerHTML.split(' - ')[0],movieCovers[i].firstChild.getAttribute('src'),movieCovers[i].getAttribute('href')));
		}
		fetchedTitles[languageIndex] = movieObjArray;
		updateNumberOfNewMovies(languageName, movieObjArray);
	}
}

function getResponseHandler(req, requestType, languageName, responseHandler)
{
	return function()
	{
		if(req.readyState == done && req.status == ok)
		{
			if(responseHandler)
			{
				responseHandler(requestType, languageName, req.responseText);
			}
		}
	}
}

function breakCookieString(cookieString)
{
	var oldMovieTitles;
	if(cookieString)
	{
		oldMovieTitles = new Array()
		var oldMovies = cookieString.split('--');
		for(i=0; i<oldMovies.length; i++)
		{
			oldMovieTitles.push(oldMovies[i]);
		}
	}
	return oldMovieTitles;
}

function getCookie(languageName)
{
	var details = new Object();
	details.url = homeUrl;
	details.name = languageName.toLowerCase()+'Movies';
	var oldMovieTitles;
	chrome.cookies.get(details, function(cookie){
		oldMovieTitles = breakCookieString(cookie.value);
	});
	return oldMovieTitles;
}

function updateNumberOfNewMovies(languageName, movieObjArray)
{
	var moviesCookie = null;// = getCookie(languageName);
	var details = new Object();
	details.url = homeUrl;
	var languageIndex = languages.indexOf(languageName);
	details.name = languageName.toLowerCase()+'Movies';
	chrome.cookies.get(details, function(cookie){
		if(cookie)
		{
			moviesCookie = breakCookieString(cookie.value);
		}
		if(!moviesCookie)
		{
			newMoviesCnt[languageIndex] += movieObjArray.length;
			for(i=0; i<movieObjArray.length; i++)
			{
				movieObjArray[i].isNew = true;
			}
		}
		else
		{
			for(i=0; i<movieObjArray.length; i++)
			{
				var movieTitle = movieObjArray[i].movieTitle;
				if(moviesCookie.indexOf(movieTitle) < 0)
				{
					newMoviesCnt[languages.indexOf(languageName)]++;
					movieObjArray[i].isNew = true;
				}
			}	
		}
		langsChecked[languageIndex] = 1;
	});
}

function fireNotification()
{
	if(sumUpArray(langsChecked) == languages.length)
	{
		alert("New movie count is: "+sumUpArray(newMoviesCnt));
	}
	else
	{
		setTimeout(fireNotification, 1000);
	}
}

function sumUpArray(arr)
{
	var sum = 0;
	for(i=0; i<arr.length; i++)
	{
		sum += arr[i];
	}
	return sum;
}

function MovieObject(title, coverSrc, watchURL)
{
	var mo =  new Object();
	mo.movieTitle = title;
	mo.movieCover = coverSrc;
	mo.watchURL = watchURL;
	mo.isNew = false;
	return mo;
}

chrome.extension.onRequest.addListener(
	function(request, sender, sendResponse) {
		if (request.requestType == "languages")
		{
			sendResponse({list: languages});
		}
		else
		{
			var index = languages.indexOf(capitaliseFirstLetter(request.requestType));
			sendResponse({list: fetchedTitles[index]});
		}	
	});