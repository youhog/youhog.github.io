import {
EBDisplayIcon
} from "@essential-blocks/controls";
export default function socialLinks({ profilesOnly, icnEffect, showTitle }) {
    return (
        <ul className="eb-social-shares">
            {profilesOnly.map(({ link, icon, iconText, linkOpenNewTab }, index) => (
                <li key={index}>
                    <a
                        className={`${(() => {
                            const faMatch = (icon || " ").match(/fa-([\w\-]+)/i);
                            const dashMatch = (icon || " ").match(/dashicons-([\w\-]+)/i);

                            if (faMatch && faMatch[1]) {
                                return faMatch[1] + '-original';
                            } else if (dashMatch && dashMatch[1]) {
                                return dashMatch[1] + '-original';
                            }
                            return '';
                        })()} ${icnEffect || " "}`}
                        href={link}
                        target={linkOpenNewTab ? "_blank" : "_self"}
                        rel="noopener"
                    >
                        <EBDisplayIcon className={`hvr-icon eb-social-share-icon`} icon={icon} />
                        {showTitle && iconText && (
                            <>
                                <span className="eb-social-share-text">{iconText}</span>
                            </>
                        )}
                    </a>
                </li>
            ))}
        </ul>
    );
}
