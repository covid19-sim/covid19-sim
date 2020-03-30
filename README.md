# covid19-sim
A simulation to show the spread of covid-19 (or other diseases) given the impact of various different factors.

## List of parameters
* Population density
  * Fixed canvas represents a fixed area, number of people is decided by population density. 
* Probability of transmission
  * Probability of transmitting disease to other people within a certain radius
* Frequency of visiting central locations
  * Can add multiple, while going to a central location, repulsion isn't felt at all.
* Social distancing
  * Coulumb replusion which is only off when they're going to a central location or when traveling to another box. It's proportional to q/r^2 where q is the parameter and r is the distance between people.  
* Incubation period
  * Gaussian distribution with mean of 6 and std of 3.
* Percent of asymptomatic people
* Response delay before implementing policies
  * Number of cases before policies like social distancing and whatnot get implemented. 
* Time of recovery
* Reinfection rate 
* Death Rate