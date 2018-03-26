/*
SQLyog Ultimate v12.09 (64 bit)
MySQL - 5.6.25 : Database - bittrex
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`bittrex` /*!40100 DEFAULT CHARACTER SET latin1 */;

USE `bittrex`;

/*Table structure for table `candle` */

DROP TABLE IF EXISTS `candle`;

CREATE TABLE `candle` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `MarketName` varchar(250) DEFAULT NULL,
  `tickInterval` varchar(50) DEFAULT NULL,
  `O` float DEFAULT NULL,
  `C` float DEFAULT NULL,
  `BV` float DEFAULT NULL,
  `V` float DEFAULT NULL,
  `H` float DEFAULT NULL,
  `L` float DEFAULT NULL,
  `T` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unquie` (`MarketName`,`tickInterval`,`T`)
) ENGINE=InnoDB AUTO_INCREMENT=2361318 DEFAULT CHARSET=latin1;

/*Table structure for table `market` */

DROP TABLE IF EXISTS `market`;

CREATE TABLE `market` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `MarketName` varchar(250) DEFAULT NULL,
  `High` float DEFAULT NULL,
  `Low` float DEFAULT NULL,
  `Volume` float DEFAULT NULL,
  `Last` float DEFAULT NULL,
  `BaseVolume` float DEFAULT NULL,
  `TimeStamp` timestamp(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `Bid` float DEFAULT NULL,
  `Ask` float DEFAULT NULL,
  `OpenBuyOrders` int(11) DEFAULT NULL,
  `OpenSellOrders` int(11) DEFAULT NULL,
  `PrevDay` float DEFAULT NULL,
  `Created` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1004633 DEFAULT CHARSET=latin1;

/*Table structure for table `trade` */

DROP TABLE IF EXISTS `trade`;

CREATE TABLE `trade` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `MarketName` varchar(250) DEFAULT NULL,
  `price_buy` float DEFAULT NULL,
  `price_sell` float DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

/*Table structure for table `volumn` */

DROP TABLE IF EXISTS `volumn`;

CREATE TABLE `volumn` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `MarketName` varchar(250) DEFAULT NULL,
  `OrderType` varchar(10) DEFAULT NULL,
  `Rate` float DEFAULT NULL,
  `Quantity` float DEFAULT NULL,
  `TimeStamp` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11929 DEFAULT CHARSET=latin1;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
